/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useEffect, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";

import { useMaybeBackdrop } from "../../hooks/CockpitIntegration.jsx";

import "./CockpitNetworkConfiguration.scss";

const _ = cockpit.gettext;

// Hook to track checkpoint status from the Cockpit networkmanager iframe
const useNetworkStatus = () => {
    const [hasActiveCheckpoint, setHasActiveCheckpoint] = useState(false);

    useEffect(() => {
        const checkpointState = window.sessionStorage.getItem("cockpit_has_checkpoint");
        setHasActiveCheckpoint(checkpointState === "true");

        const handleCheckpointEvent = (event) => {
            if (event.key === "cockpit_has_checkpoint") {
                setHasActiveCheckpoint(event.newValue === "true");
            }
        };

        window.addEventListener("storage", handleCheckpointEvent);

        return () => window.removeEventListener("storage", handleCheckpointEvent);
    }, []);

    return { hasActiveCheckpoint };
};

export const CockpitNetworkConfiguration = ({
    onCritFail,
    setIsNetworkOpen,
}) => {
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const { hasActiveCheckpoint } = useNetworkStatus();
    const backdropClass = useMaybeBackdrop();
    const handleIframeLoad = () => setIsIframeMounted(true);
    const idPrefix = "cockpit-network-configuration";

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("cockpit-network-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Network plugin failed") })({ message: exception.error.message, stack: exception.error.stack });
            });
        }
    }, [isIframeMounted, onCritFail]);

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
                        <iframe
                          src="/cockpit/@localhost/network/index.html"
                          name="cockpit-network"
                          id="cockpit-network-frame"
                          onLoad={handleIframeLoad}
                          className={idPrefix + "-iframe-cockpit-network"} />
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
