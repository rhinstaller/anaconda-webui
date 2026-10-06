/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";

import { useMaybeBackdrop } from "../../hooks/CockpitIntegration.jsx";

import { CockpitNetworkIframe } from "./NetworkConfiguration.jsx";
import { useNetworkStatus } from "./useNetworkStatus.js";

import "./CockpitNetworkConfiguration.scss";

const _ = cockpit.gettext;

export const CockpitNetworkConfiguration = ({
    onCritFail,
    setIsNetworkOpen,
}) => {
    const { hasActiveCheckpoint } = useNetworkStatus();
    const backdropClass = useMaybeBackdrop();
    const idPrefix = "cockpit-network-configuration";

    const handleClose = () => {
        // Prevent closing if there's an active checkpoint
        if (hasActiveCheckpoint) {
            return;
        }
        setIsNetworkOpen(false);
    };

    return (
        <Modal
          id={idPrefix + "-modal"}
          aria-label={_("Configure network")}
          isOpen
          onClose={handleClose}
          showClose={false}
          className={backdropClass + " " + idPrefix + "-modal-page-section"}
          variant={ModalVariant.large}>
            <ModalHeader title={_("Network Configuration")} />
            <ModalBody style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className={idPrefix + "-page-section-cockpit-network"} style={{ flex: 1 }}>
                    <PageSection hasBodyWrapper={false} style={{ height: "100%" }}>
                        <CockpitNetworkIframe
                          iframeId="cockpit-network-frame"
                          iframeName="cockpit-network"
                          className={idPrefix + "-iframe-cockpit-network"}
                          onCritFail={onCritFail} />
                    </PageSection>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  isLoading={hasActiveCheckpoint}
                  isDisabled={hasActiveCheckpoint}>
                    {hasActiveCheckpoint ? _("Applying changes...") : _("Close")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
