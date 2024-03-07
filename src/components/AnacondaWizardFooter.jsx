/*
 * Copyright (C) 2024 Red Hat, Inc.
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
import React, { useContext, useState } from "react";
import {
    ActionList,
    Button,
    Modal,
    ModalVariant,
    Stack,
    WizardFooterWrapper,
    useWizardContext
} from "@patternfly/react-core";

import { ReviewConfigurationConfirmModal } from "./review/ReviewConfiguration.jsx";
import { SystemTypeContext } from "./Common.jsx";
import { applyStorage } from "../apis/storage_partitioning.js";
import { applyAccounts } from "./users/Accounts.jsx";
import { exitGui } from "../helpers/exit.js";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const AnacondaWizardFooterTemplate = ({
    extraActions,
    currentStepProps,
    isFirstScreen,
    isFormDisabled,
    isFormValid,
    onNext,
    setIsFormValid,
}) => {
    const [quitWaitsConfirmation, setQuitWaitsConfirmation] = useState(false);
    const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    const onBack = () => {
        // first reset validation state to default
        setIsFormValid(true);
        goToPrevStep();
    };

    const footerHelperText = currentStepProps?.footerHelperText;
    const nextButtonText = currentStepProps?.nextButtonText || _("Next");
    const nextButtonVariant = currentStepProps?.nextButtonVariant || "primary";

    return (
        <WizardFooterWrapper>
            <Stack hasGutter>
                {extraActions}
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
                      isDisabled={!isFormValid || isFormDisabled}
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

export const AnacondaWizardFooter = ({
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
    const { activeStep } = useWizardContext();

    const onNext = (activeStep, goToNextStep) => {
        // first reset validation state to default
        setIsFormValid(true);

        if (activeStep.id === "disk-encryption") {
            setIsFormDisabled(true);

            applyStorage({
                encrypt: storageEncryption.encrypt,
                encryptPassword: storageEncryption.password,
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
        } else if (activeStep.id === "installation-review") {
            setNextWaitsConfirmation(true);
        } else if (activeStep.id === "mount-point-mapping") {
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
                partitioning,
            });
        } else if (activeStep.id === "accounts") {
            applyAccounts(accounts)
                    .then(() => goToNextStep())
                    .catch(onCritFail({ context: N_("Account setting failed.") }));
        } else {
            goToNextStep();
        }
    };

    const currentStep = stepsOrder.find(s => s.id === activeStep.id);
    const isFirstScreen = stepsOrder.filter(step => !step.isHidden)[0].id === activeStep.id;

    return (
        <AnacondaWizardFooterTemplate
          currentStepProps={currentStep}
          extraActions={
              activeStep.id === "installation-review" &&
                  nextWaitsConfirmation &&
                  <ReviewConfigurationConfirmModal
                    idPrefix={activeStep.id}
                    onNext={() => { setShowWizard(false); cockpit.location.go(["installation-progress"]) }}
                    setNextWaitsConfirmation={setNextWaitsConfirmation}
                    storageScenarioId={storageScenarioId}
                  />
          }
          isFirstScreen={isFirstScreen}
          isFormDisabled={isFormDisabled}
          isFormValid={isFormValid}
          onNext={onNext}
        />
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
