/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext, useState } from "react";
import { ActionList, ActionListGroup, ActionListItem } from "@patternfly/react-core/dist/esm/components/ActionList/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { useWizardContext, WizardFooterWrapper } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import { exitGui } from "../helpers/exit.js";

import { FooterContext, SystemTypeContext } from "../contexts/Common.jsx";

const _ = cockpit.gettext;

export const AnacondaWizardFooter = ({
    extraActions,
    footerHelperText,
    nextButtonText,
    nextButtonVariant,
    onNext,
}) => {
    const [quitWaitsConfirmation, setQuitWaitsConfirmation] = useState(false);
    const { activeStep, goToNextStep, goToPrevStep, steps } = useWizardContext();
    const isFirstScreen = activeStep.id === steps.find(step => !step.isHidden).id;
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const {
        isFormDisabled,
        isFormValid,
        setIsFormDisabled,
        setIsFormValid,
    } = useContext(FooterContext);

    const onNextButtonClicked = () => {
        if (onNext) {
            onNext({
                goToNextStep,
                isFormDisabled,
                isFormValid,
                setIsFormDisabled,
                setIsFormValid,
            });
        } else {
            goToNextStep();
        }
    };

    const onBack = () => {
        // first reset validation state to default
        setIsFormValid(true);
        goToPrevStep();
    };

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
                    <ActionListGroup>
                        <ActionListItem>
                            <Button
                              id="installation-back-btn"
                              variant="secondary"
                              isAriaDisabled={isFirstScreen || isFormDisabled}
                              onClick={() => onBack()}>
                                {_("Back")}
                            </Button>
                        </ActionListItem>
                        <ActionListItem>
                            <Button
                              id="installation-next-btn"
                              variant={nextButtonVariant || "primary"}
                              isAriaDisabled={!isFormValid || isFormDisabled}
                              onClick={onNextButtonClicked}>
                                {nextButtonText || _("Next")}
                            </Button>
                        </ActionListItem>
                    </ActionListGroup>
                    <ActionListItem>
                        <Button
                          id="installation-quit-btn"
                          isAriaDisabled={isFormDisabled}
                          variant="link"
                          onClick={() => {
                              setQuitWaitsConfirmation(true);
                          }}
                        >
                            {isBootIso ? _("Reboot") : _("Quit")}
                        </Button>
                    </ActionListItem>
                </ActionList>
            </Stack>
        </WizardFooterWrapper>
    );
};

export const QuitInstallationConfirmModal = ({ exitGui, setQuitWaitsConfirmation }) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";

    return (
        <Modal
          id="installation-quit-confirm-dialog"
          isOpen
          onClose={() => setQuitWaitsConfirmation(false)}
          variant={ModalVariant.small}
        >
            <ModalHeader
              title={isBootIso ? _("Reboot system?") : _("Quit installer?")}
              titleIconVariant="warning"
            />
            <ModalBody>
                {_("Your progress will not be saved.")}
            </ModalBody>
            <ModalFooter>
                <Button
                  id="installation-quit-confirm-btn"
                  key="confirm"
                  onClick={() => {
                      exitGui();
                  }}
                  variant="danger"
                >
                    {isBootIso ? _("Reboot") : _("Quit")}
                </Button>
                <Button
                  id="installation-quit-confirm-cancel-btn"
                  key="cancel"
                  onClick={() => setQuitWaitsConfirmation(false)}
                  variant="secondary">
                    {_("Continue installation")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
