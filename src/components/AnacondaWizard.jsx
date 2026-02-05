/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { usePageLocation } from "hooks";

import React, { useContext, useEffect, useState } from "react";
import { PageSection, PageSectionTypes } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Wizard, WizardStep } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { FooterContext, PayloadContext, StorageContext, UserInterfaceContext } from "../contexts/Common.jsx";

import { AnacondaPage } from "./AnacondaPage.jsx";
import { AnacondaWizardFooter } from "./AnacondaWizardFooter.jsx";
import { getSteps } from "./steps.js";

export const AnacondaWizard = ({ currentStepId, dispatch, isFetching, onCritFail, setCurrentStepId, showStorage }) => {
    // The Form should be disabled while backend checks are in progress
    // or the page initialization is in progress
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    // The Form should be marked as invalid when the user filled data
    // are failing the validation
    const [isFormValid, setIsFormValid] = useState(false);
    const { storageScenarioId } = useContext(StorageContext);
    const isBootIso = useContext(StorageContext).systemType === "BOOT_ISO";
    const payloadType = useContext(PayloadContext).type;
    const userInterfaceConfig = useContext(UserInterfaceContext);
    const { path } = usePageLocation();

    const componentProps = {
        dispatch,
        isFormDisabled: isFormDisabled || isFetching,
        onCritFail,
        setIsFormDisabled,
        setIsFormValid,
    };

    const stepsOrder = getSteps(userInterfaceConfig, { isBootIso, payloadType, storageScenarioId });
    const firstStepId = stepsOrder.filter(s => !s.isHidden)[0].id;

    useEffect(() => {
        if (path[0] && path[0] !== currentStepId) {
            // If path is set respect it
            setCurrentStepId(path[0]);
        } else if (!currentStepId) {
            // Otherwise set the first step as the current step
            setCurrentStepId(firstStepId);
        }
    }, [currentStepId, firstStepId, path, setCurrentStepId]);

    const createSteps = (stepsOrder, componentProps) => {
        return stepsOrder.map(s => {
            const isVisited = firstStepId === s.id || currentStepId === s.id;
            let stepProps = {
                id: s.id,
                isAriaDisabled: isFormDisabled || isFetching,
                isHidden: s.isHidden || s.isFinal,
                isVisited,
                name: s.label,
                stepNavItemProps: { id: s.id },
                ...(s.steps?.length && { isExpandable: true }),
            };
            if (s.component) {
                stepProps = {
                    children: (
                        <AnacondaPage
                          isFormDisabled={isFormDisabled}
                          setIsFormDisabled={setIsFormDisabled}
                          step={s.id}
                          title={s.title}
                          isFirstScreen={s.isFirstScreen}
                          showStorage={showStorage}
                          usePageInit={s.usePageInit}>
                            <s.component {...componentProps} isFirstScreen={s.isFirstScreen} />
                        </AnacondaPage>
                    ),
                    ...stepProps
                };
            } else if (s.steps) {
                const subSteps = createSteps(s.steps, componentProps);
                stepProps = {
                    ...stepProps,
                    steps: [...subSteps]
                };
            }
            return (
                <WizardStep key={s.id + s.isVisited + (stepProps.isAriaDisabled ? "-disabled" : "-not-disabled")} {...stepProps} />
            );
        });
    };
    const steps = createSteps(stepsOrder, componentProps);

    const goToStep = (newStep, prevStep) => {
        if (prevStep.id !== newStep.id) {
            // first reset validation state to default
            setIsFormValid(false);
            // and disable the form so that the page can perform
            //  initialization before the user can interact with it
            setIsFormDisabled(true);
        }

        cockpit.location.go([newStep.id]);
    };

    const finalStep = stepsOrder[stepsOrder.length - 1];
    if (path[0] === finalStep.id) {
        return (
            <PageSection hasBodyWrapper={false} type={PageSectionTypes.wizard}>
                <finalStep.component {...componentProps} />
            </PageSection>
        );
    }

    const startIndex = steps.findIndex(step => {
        // Find the first step that is not hidden if the Wizard is opening for the first time.
        // Otherwise, find the first step that was last visited.
        return currentStepId ? step.props.id === currentStepId : !step.props.isHidden;
    }) + 1;

    // Properties from usePage to be passed to the Wizard Footer,
    // in case the Page is not using custom footer.
    const stepProps = stepsOrder[startIndex - 1];
    const footerProps = {
        footerHelperText: stepProps?.footerHelperText,
        nextButtonText: stepProps?.nextButtonText,
        nextButtonVariant: stepProps?.nextButtonVariant,
    };

    return (
        <PageSection hasBodyWrapper={false} type={PageSectionTypes.wizard}>
            <FooterContext.Provider value={{
                isFormDisabled: isFormDisabled || isFetching,
                isFormValid,
                setIsFormDisabled,
                setIsFormValid,
            }}>
                <Wizard
                  className={"anaconda-wizard-step-" + currentStepId}
                  id="installation-wizard"
                  isVisitRequired
                  startIndex={startIndex}
                  footer={<AnacondaWizardFooter {...footerProps} />}
                  onStepChange={((event, currentStep, prevStep) => goToStep(currentStep, prevStep))}
                >
                    {steps}
                </Wizard>
            </FooterContext.Provider>
        </PageSection>
    );
};
