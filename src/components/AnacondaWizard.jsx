/*
 * Copyright (C) 2022 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */
import cockpit from "cockpit";

import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    PageSection,
    PageSectionTypes,
    PageSectionVariants,
    Wizard,
    WizardStep,
} from "@patternfly/react-core";

import { resetPartitioning } from "../apis/storage_partitioning.js";

import { AnacondaPage } from "./AnacondaPage.jsx";
import { AnacondaWizardFooter } from "./AnacondaWizardFooter.jsx";
import { FooterContext, StorageContext } from "./Common.jsx";
import { InstallationProgress } from "./installation/InstallationProgress.jsx";
import { getSteps } from "./steps.js";
import { CockpitStorageIntegration } from "./storage/CockpitStorageIntegration.jsx";
const N_ = cockpit.noop;

export const AnacondaWizard = ({ dispatch, onCritFail, showStorage, setShowStorage }) => {
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [reusePartitioning, setReusePartitioning] = useState(false);
    const [stepNotification, setStepNotification] = useState();
    const [showWizard, setShowWizard] = useState(true);
    const [currentStepId, setCurrentStepId] = useState();
    const storageData = useContext(StorageContext);
    const storageScenarioId = storageData.storageScenarioId;
    const selectedDisks = storageData.diskSelection.selectedDisks;
    const [scenarioPartitioningMapping, setScenarioPartitioningMapping] = useState({});

    useEffect(() => {
        if (storageScenarioId && storageData.partitioning.path) {
            setScenarioPartitioningMapping(_scenarioPartitioningMapping => ({
                ..._scenarioPartitioningMapping,
                [storageScenarioId]: storageData.partitioning.path
            }));
        }
    }, [storageData.partitioning.path, storageScenarioId]);

    const availableDevices = useMemo(() => {
        return Object.keys(storageData.devices);
    }, [storageData.devices]);

    useEffect(() => {
        if (!currentStepId) {
            return;
        }
        cockpit.location.go([currentStepId]);
    }, [currentStepId]);

    useEffect(() => {
        /*
         * When disk selection changes or the user re-scans the devices we need to re-create the partitioning.
         * For Automatic partitioning we do it each time we go to review page,
         * but for custom mount assignment we try to reuse the partitioning when possible.
         */
        setReusePartitioning(false);
    }, [availableDevices, selectedDisks]);

    const componentProps = {
        dispatch,
        isFormDisabled,
        onCritFail,
        reusePartitioning,
        scenarioPartitioningMapping,
        setIsFormDisabled,
        setIsFormValid,
        setReusePartitioning,
        setShowStorage,
    };

    const getFlattenedStepsIds = (steps) => {
        const stepIds = [];
        for (const step of steps) {
            stepIds.push(step.id);
            if (step.steps) {
                for (const childStep of step.steps) {
                    if (childStep?.isHidden !== true) {
                        stepIds.push(childStep.id);
                    }
                }
            }
        }
        return stepIds;
    };
    const stepsOrder = getSteps();
    const flattenedStepsIds = getFlattenedStepsIds(stepsOrder);
    const firstStepId = stepsOrder[0].id;

    const isStepFollowedBy = (earlierStepId, laterStepId) => {
        const earlierStepIdx = flattenedStepsIds.findIndex(s => s === earlierStepId);
        const laterStepIdx = flattenedStepsIds.findIndex(s => s === laterStepId);
        return earlierStepIdx < laterStepIdx;
    };

    const createSteps = (stepsOrder, componentProps) => {
        return stepsOrder.map(s => {
            const isVisited = firstStepId === s.id || currentStepId === s.id;
            let stepProps = {
                id: s.id,
                isHidden: s.isHidden,
                isVisited,
                name: s.label,
                stepNavItemProps: { id: s.id },
                ...(s.steps?.length && { isExpandable: true }),
            };
            if (s.component) {
                stepProps = {
                    children: (
                        <AnacondaPage step={s.id} title={s.title} stepNotification={stepNotification}>
                            <s.component
                              idPrefix={s.id}
                              setStepNotification={ex => setStepNotification({ step: s.id, ...ex })}
                              {...componentProps}
                            />
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
                <WizardStep key={s.id + s.isVisited} {...stepProps} />
            );
        });
    };
    const steps = createSteps(stepsOrder, componentProps);

    const goToStep = (newStep, prevStep) => {
        if (prevStep.id !== newStep.id) {
            // first reset validation state to default
            setIsFormValid(false);
        }

        // Reset the applied partitioning when going back from a step after creating partitioning to a step
        // before creating partitioning.
        if ((prevStep.id === "accounts" || isStepFollowedBy("accounts", prevStep.id)) &&
            isStepFollowedBy(newStep.id, "accounts")) {
            setIsFormDisabled(true);
            resetPartitioning()
                    .then(
                        () => setCurrentStepId(newStep.id),
                        () => onCritFail({ context: cockpit.format(N_("Error was hit when going back from $0."), prevStep.prevName) })
                    )
                    .always(() => setIsFormDisabled(false));
        } else {
            setCurrentStepId(newStep.id);
        }
    };

    if (!showWizard) {
        return (
            <PageSection variant={PageSectionVariants.light}>
                <InstallationProgress onCritFail={onCritFail} />
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

    if (showStorage) {
        return (
            <CockpitStorageIntegration
              dispatch={dispatch}
              onCritFail={onCritFail}
              scenarioPartitioningMapping={scenarioPartitioningMapping}
              setShowStorage={setShowStorage}
            />
        );
    }

    return (
        <PageSection type={PageSectionTypes.wizard} variant={PageSectionVariants.light}>
            <FooterContext.Provider value={{
                isFormDisabled,
                isFormValid,
                setIsFormDisabled,
                setIsFormValid,
                setShowWizard,
                setStepNotification,
            }}>
                <Wizard
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
