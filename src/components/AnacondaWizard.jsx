/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { usePageLocation } from "hooks";

import React, { useContext, useEffect, useState } from "react";
import { PageSection, PageSectionTypes } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Wizard, WizardStep } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { PageContext, PayloadContext, StorageContext, SystemTypeContext, UserInterfaceContext } from "../contexts/Common.jsx";

import { AnacondaPage } from "./AnacondaPage.jsx";
import { AnacondaWizardFooter } from "./AnacondaWizardFooter.jsx";
import { getSteps } from "./steps.js";

export const AnacondaWizard = ({ automatedInstall, currentStepId, dispatch, isFetching, onCritFail, setCurrentStepId, showStorage }) => {
    /**
     * Wizard step page state (reset in `AnacondaWizard` `goToStep` on step change).
     * - **isFormValid** / **setIsFormValid** — Required fields satisfied; reset when the step changes in the wizard.
     * - **isFormDisabled** / **setIsFormDisabled** — Block input during init or async work
     * - **stepNotification** / **setStepNotification** — Inline alert for the active step; cleared on step change.
     */
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [stepNotification, setStepNotification] = useState(null);

    const { storageScenarioId } = useContext(StorageContext);
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const payloadType = useContext(PayloadContext).type;
    const userInterfaceConfig = useContext(UserInterfaceContext);
    const { path } = usePageLocation();

    const componentProps = {
        automatedInstall,
        dispatch,
        onCritFail,
    };

    const pageContextValue = {
        isFormDisabled: isFormDisabled || isFetching,
        isFormValid,
        setIsFormDisabled,
        setIsFormValid,
        setStepNotification,
        stepNotification,
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
                isDisabled: isFormDisabled || isFetching,
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
            setStepNotification(null);
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
            <PageContext.Provider value={pageContextValue}>
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
            </PageContext.Provider>
        </PageSection>
    );
};
