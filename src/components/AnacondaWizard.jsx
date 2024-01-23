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
import React, { useContext, useEffect, useState, useMemo } from "react";

import {
    ActionList,
    Button,
    Modal,
    ModalVariant,
    PageSection,
    PageSectionTypes,
    PageSectionVariants,
    Stack,
    useWizardContext,
    Wizard,
    WizardFooterWrapper,
    WizardStep
} from "@patternfly/react-core";

import { AnacondaPage } from "./AnacondaPage.jsx";
import { InstallationMethod, getPageProps as getInstallationMethodProps } from "./storage/InstallationMethod.jsx";
import { getDefaultScenario } from "./storage/InstallationScenario.jsx";
import { CockpitStorageIntegration } from "./storage/CockpitStorageIntegration.jsx";
import { MountPointMapping, getPageProps as getMountPointMappingProps } from "./storage/MountPointMapping.jsx";
import { DiskEncryption, getStorageEncryptionState, getPageProps as getDiskEncryptionProps } from "./storage/DiskEncryption.jsx";
import { InstallationLanguage, getPageProps as getInstallationLanguageProps } from "./localization/InstallationLanguage.jsx";
import { Accounts, getPageProps as getAccountsProps, getAccountsState, applyAccounts } from "./users/Accounts.jsx";
import { InstallationProgress } from "./installation/InstallationProgress.jsx";
import { ReviewConfiguration, ReviewConfigurationConfirmModal, getPageProps as getReviewConfigurationProps } from "./review/ReviewConfiguration.jsx";
import { exitGui } from "../helpers/exit.js";
import {
    applyStorage,
    resetPartitioning,
} from "../apis/storage_partitioning.js";
import { SystemTypeContext, OsReleaseContext } from "./Common.jsx";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const AnacondaWizard = ({ dispatch, storageData, localizationData, runtimeData, onCritFail, showStorage, setShowStorage, title, conf }) => {
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [reusePartitioning, setReusePartitioning] = useState(false);
    const [stepNotification, setStepNotification] = useState();
    const [storageEncryption, setStorageEncryption] = useState(getStorageEncryptionState());
    const [storageScenarioId, setStorageScenarioId] = useState(window.localStorage.getItem("storage-scenario-id") || getDefaultScenario().id);
    const [accounts, setAccounts] = useState(getAccountsState());
    const [showWizard, setShowWizard] = useState(true);
    const [currentStepId, setCurrentStepId] = useState();
    const osRelease = useContext(OsReleaseContext);
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";
    const selectedDisks = storageData.diskSelection.selectedDisks;
    const [scenarioPartitioningMapping, setScenarioPartitioningMapping] = useState({});

    useEffect(() => {
        if (storageScenarioId && storageData.partitioning.path) {
            setScenarioPartitioningMapping({ [storageScenarioId]: storageData.partitioning.path });
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

    const language = useMemo(() => {
        for (const l of Object.keys(localizationData.languages)) {
            const locale = localizationData.languages[l].locales.find(locale => locale["locale-id"].v === localizationData.language);

            if (locale) {
                return locale;
            }
        }
    }, [localizationData]);
    const stepsOrder = [
        {
            component: InstallationLanguage,
            data: { dispatch, languages: localizationData.languages, language: localizationData.language, commonLocales: localizationData.commonLocales },
            ...getInstallationLanguageProps({ isBootIso, osRelease })
        },
        {
            component: InstallationMethod,
            data: {
                deviceData: storageData.devices,
                deviceNames: storageData.deviceNames,
                diskSelection: storageData.diskSelection,
                dispatch,
                partitioning: storageData.partitioning.path,
                scenarioPartitioningMapping,
                storageScenarioId,
                setStorageScenarioId: (scenarioId) => {
                    window.sessionStorage.setItem("storage-scenario-id", scenarioId);
                    setStorageScenarioId(scenarioId);
                },
                setShowStorage,
            },
            ...getInstallationMethodProps({ isBootIso, osRelease, isFormValid })
        },
        {
            id: "disk-configuration",
            label: _("Disk configuration"),
            steps: [{
                component: MountPointMapping,
                data: {
                    deviceData: storageData.devices,
                    dispatch,
                    partitioningData: storageData.partitioning,
                    reusePartitioning,
                    setReusePartitioning,
                },
                ...getMountPointMappingProps({ storageScenarioId })
            }, {
                component: DiskEncryption,
                data: {
                    storageEncryption,
                    setStorageEncryption,
                    passwordPolicies: runtimeData.passwordPolicies,
                },
                ...getDiskEncryptionProps({ storageScenarioId })
            }]
        },
        {
            component: Accounts,
            data: {
                accounts,
                setAccounts,
                passwordPolicies: runtimeData.passwordPolicies,
            },
            ...getAccountsProps({ isBootIso })
        },
        {
            component: ReviewConfiguration,
            data: {
                deviceData: storageData.devices,
                diskSelection: storageData.diskSelection,
                requests: storageData.partitioning ? storageData.partitioning.requests : null,
                language,
                localizationData,
                storageScenarioId,
                accounts,
            },
            ...getReviewConfigurationProps({ storageScenarioId })
        },
    ];

    const componentProps = {
        isFormDisabled,
        onCritFail,
        setIsFormDisabled,
        setIsFormValid,
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
    const flattenedStepsIds = getFlattenedStepsIds(stepsOrder);
    const firstStepId = stepsOrder.filter(step => !step.isHidden)[0].id;

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
                              {...s.data}
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

    if (showStorage) {
        return (
            <CockpitStorageIntegration
              deviceData={storageData.devices}
              dispatch={dispatch}
              onCritFail={onCritFail}
              scenarioPartitioningMapping={scenarioPartitioningMapping}
              selectedDisks={selectedDisks}
              setShowStorage={setShowStorage}
              setStorageScenarioId={setStorageScenarioId}
            />
        );
    }

    return (
        <PageSection type={PageSectionTypes.wizard} variant={PageSectionVariants.light}>
            <Wizard
              id="installation-wizard"
              isVisitRequired
              startIndex={startIndex}
              footer={<Footer
                onCritFail={onCritFail}
                isFormValid={isFormValid}
                partitioning={storageData.partitioning?.path}
                setIsFormValid={setIsFormValid}
                setStepNotification={setStepNotification}
                isFormDisabled={isFormDisabled}
                setIsFormDisabled={setIsFormDisabled}
                setShowWizard={setShowWizard}
                stepsOrder={stepsOrder}
                storageEncryption={storageEncryption}
                storageScenarioId={storageScenarioId}
                accounts={accounts}
              />}
              onStepChange={((event, currentStep, prevStep) => goToStep(currentStep, prevStep))}
            >
                {steps}
            </Wizard>
        </PageSection>
    );
};

const Footer = ({
    onCritFail,
    isFormValid,
    setIsFormValid,
    setStepNotification,
    isFormDisabled,
    partitioning,
    setIsFormDisabled,
    setShowWizard,
    stepsOrder,
    storageEncryption,
    storageScenarioId,
    accounts,
}) => {
    const [nextWaitsConfirmation, setNextWaitsConfirmation] = useState(false);
    const [quitWaitsConfirmation, setQuitWaitsConfirmation] = useState(false);
    const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    const onNext = (activeStep, goToNextStep) => {
        // first reset validation state to default
        setIsFormValid(true);

        if (activeStep.id === "disk-encryption") {
            setIsFormDisabled(true);

            applyStorage({
                onFail: ex => {
                    console.error(ex);
                    setIsFormDisabled(false);
                    setStepNotification({ step: activeStep.id, ...ex });
                },
                onSuccess: () => {
                    goToNextStep();

                    // Reset the state after the onNext call. Otherwise,
                    // React will try to render the current step again.
                    setIsFormDisabled(false);
                    setStepNotification();
                },
                encrypt: storageEncryption.encrypt,
                encryptPassword: storageEncryption.password,
            });
        } else if (activeStep.id === "installation-review") {
            setNextWaitsConfirmation(true);
        } else if (activeStep.id === "mount-point-mapping") {
            setIsFormDisabled(true);

            applyStorage({
                partitioning,
                onFail: ex => {
                    console.error(ex);
                    setIsFormDisabled(false);
                    setStepNotification({ step: activeStep.id, ...ex });
                },
                onSuccess: () => {
                    goToNextStep();

                    // Reset the state after the onNext call. Otherwise,
                    // React will try to render the current step again.
                    setIsFormDisabled(false);
                    setStepNotification();
                },
            });
        } else if (activeStep.id === "accounts") {
            applyAccounts(accounts)
                    .then(() => goToNextStep())
                    .catch(onCritFail({ context: N_("Account setting failed.") }));
        } else {
            goToNextStep();
        }
    };

    const onBack = () => {
        // first reset validation state to default
        setIsFormValid(true);
        goToPrevStep();
    };

    const currentStep = stepsOrder.find(s => s.id === activeStep.id);
    const footerHelperText = currentStep?.footerHelperText;
    const isFirstScreen = stepsOrder.filter(step => !step.isHidden)[0].id === activeStep.id;
    const nextButtonText = currentStep?.nextButtonText || _("Next");
    const nextButtonVariant = currentStep?.nextButtonVariant || "primary";

    return (
        <WizardFooterWrapper>
            <Stack hasGutter>
                {activeStep.id === "installation-review" &&
                    nextWaitsConfirmation &&
                    <ReviewConfigurationConfirmModal
                      idPrefix={activeStep.id}
                      onNext={() => { setShowWizard(false); cockpit.location.go(["installation-progress"]) }}
                      setNextWaitsConfirmation={setNextWaitsConfirmation}
                      storageScenarioId={storageScenarioId}
                    />}
                {quitWaitsConfirmation &&
                    <QuitInstallationConfirmModal
                      exitGui={exitGui}
                      setQuitWaitsConfirmation={setQuitWaitsConfirmation}
                    />}
                {footerHelperText}
                <ActionList>
                    <Button
                      id="installation-back-btn"
                      variant="secondary"
                      isDisabled={isFirstScreen || isFormDisabled}
                      onClick={() => onBack()}>
                        {_("Back")}
                    </Button>
                    <Button
                      id="installation-next-btn"
                      variant={nextButtonVariant}
                      isDisabled={
                          !isFormValid ||
                            isFormDisabled ||
                            nextWaitsConfirmation
                      }
                      onClick={() => onNext(activeStep, goToNextStep)}>
                        {nextButtonText}
                    </Button>
                    <Button
                      id="installation-quit-btn"
                      isDisabled={isFormDisabled}
                      style={{ marginLeft: "var(--pf-v5-c-wizard__footer-cancel--MarginLeft)" }}
                      variant="link"
                      onClick={() => {
                          setQuitWaitsConfirmation(true);
                      }}
                    >
                        {isBootIso ? _("Reboot") : _("Quit")}
                    </Button>
                </ActionList>
            </Stack>
        </WizardFooterWrapper>
    );
};

export const QuitInstallationConfirmModal = ({ exitGui, setQuitWaitsConfirmation }) => {
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    return (
        <Modal
          id="installation-quit-confirm-dialog"
          actions={[
              <Button
                id="installation-quit-confirm-btn"
                key="confirm"
                onClick={() => {
                    exitGui();
                }}
                variant="danger"
              >
                  {isBootIso ? _("Reboot") : _("Quit")}
              </Button>,
              <Button
                id="installation-quit-confirm-cancel-btn"
                key="cancel"
                onClick={() => setQuitWaitsConfirmation(false)}
                variant="secondary">
                  {_("Continue installation")}
              </Button>
          ]}
          isOpen
          onClose={() => setQuitWaitsConfirmation(false)}
          title={isBootIso ? _("Reboot system?") : _("Quit installer?")}
          titleIconVariant="warning"
          variant={ModalVariant.small}
        >
            {_("Your progress will not be saved.")}
        </Modal>
    );
};
