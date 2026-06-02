/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-progress";

export const InstallationNonCriticalErrorDialog = ({ errorDialogData, onSubmitDecision }) => {
    if (!errorDialogData) {
        return null;
    }

    return (
        <Modal
          id={SCREEN_ID + "-installation-error-dialog"}
          isOpen
          variant={ModalVariant.small}
          onClose={() => onSubmitDecision(false)}
        >
            <ModalHeader
              title={_("Continue installation?")}
              titleIconVariant="warning"
            />
            <ModalBody>
                <Content component="p">
                    {errorDialogData.message}
                </Content>
            </ModalBody>
            <ModalFooter>
                <Button
                  id={SCREEN_ID + "-installation-error-continue-btn"}
                  onClick={() => onSubmitDecision(true)}
                >
                    {_("Continue installation")}
                </Button>
                <Button
                  id={SCREEN_ID + "-installation-error-abort-btn"}
                  variant="secondary"
                  onClick={() => onSubmitDecision(false)}
                >
                    {_("Abort installation")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
