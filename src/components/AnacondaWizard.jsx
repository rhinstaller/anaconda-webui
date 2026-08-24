/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { PageSection, PageSectionTypes } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Wizard, WizardStep } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { INSTALLATION_STATUS } from "../apis/boss.js";

import { BossContext, PageContext, PayloadContext, StorageContext, SystemTypeContext, UserInterfaceContext } from "../contexts/Common.jsx";

import { AnacondaPage } from "./AnacondaPage.jsx";
import { AnacondaWizardFooter } from "./AnacondaWizardFooter.jsx";
import { getSteps } from "./steps.js";

export const AnacondaWizard = ({ automatedInstall, currentStepId, dispatch, isFetching, onCritFail, pauseAtSummary, setCurrentStepId, setShowStorage, showStorage }) => {
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
    const { installationStatus } = useContext(BossContext);

    const autoProceedBlockedRef = useRef(false);

    const stepsOrder = getSteps(automatedInstall, userInterfaceConfig, { isBootIso, payloadType, storageScenarioId });
    const firstStepId = stepsOrder.find(s => s.isFirstScreen)?.id;
    const finalStepId = stepsOrder[stepsOrder.length - 1]?.id;

    const goToProgressPage = useCallback(() => {
        setCurrentStepId(finalStepId);
    }, [finalStepId, setCurrentStepId]);

    const componentProps = {
        autoProceedBlockedRef,
        automatedInstall,
        dispatch,
        goToProgressPage,
        onCritFail,
        pauseAtSummary,
        setShowStorage,
    };

    const pageContextValue = {
        isFormDisabled: isFormDisabled || isFetching,
        isFormValid,
        setIsFormDisabled,
        setIsFormValid,
        setStepNotification,
        stepNotification,
    };

    useEffect(() => {
        if (installationStatus === null) {
            return;
        }

        if (installationStatus !== INSTALLATION_STATUS.NOT_STARTED) {
            if (currentStepId !== finalStepId) {
                setCurrentStepId(finalStepId);
            }
            return;
        }

        if (!currentStepId) {
            setCurrentStepId(firstStepId);
        }
    }, [currentStepId, finalStepId, firstStepId, installationStatus, setCurrentStepId]);

    useEffect(() => {
        if (currentStepId) {
            cockpit.location.go([currentStepId]);
        }
    }, [currentStepId]);

    const flatStepIds = stepsOrder.flatMap(s => s.steps ? s.steps.map(sub => sub.id) : [s.id]);
    const currentStepIndex = flatStepIds.indexOf(currentStepId);

    const createSteps = (stepsOrder, componentProps) => {
        return stepsOrder.map(s => {
            const stepIndex = s.steps
                ? flatStepIds.indexOf(s.steps[0].id)
                : flatStepIds.indexOf(s.id);
            const isFutureStep = stepIndex > currentStepIndex;
            let stepProps = {
                id: s.id,
                isAriaDisabled: isFormDisabled || isFetching,
                isDisabled: isFormDisabled || isFetching,
                isHidden: s.isHidden || s.isFinal,
                name: s.label,
                navItem: { id: s.id, isDisabled: isFutureStep },
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

        setCurrentStepId(newStep.id);
    };

    const finalStep = stepsOrder[stepsOrder.length - 1];
    if (currentStepId === finalStep.id) {
        return (
            <PageSection hasBodyWrapper={false} type={PageSectionTypes.wizard}>
                <finalStep.component {...componentProps} />
            </PageSection>
        );
    }
    if (currentStepId === undefined) {
        return null;
    }

    let startIndex = stepsOrder.findIndex(step => step.isFirstScreen) + 1;

    // HACK: start index is calculated incorrectly for KS installations
    if (automatedInstall) {
        startIndex += 1;
    }

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
