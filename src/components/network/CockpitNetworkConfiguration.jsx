/*
 * Copyright (C) 2023 Red Hat, Inc.
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

import React, { useEffect, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";

import "./CockpitNetworkConfiguration.scss";

const _ = cockpit.gettext;

export const CockpitNetworkConfiguration = ({
    onCritFail,
    setIsNetworkOpen,
}) => {
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const handleIframeLoad = () => setIsIframeMounted(true);
    const idPrefix = "cockpit-network-configuration";

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("cockpit-network-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Network plugin failed"), isFrontend: true })({ message: exception.error.message, stack: exception.error.stack });
            });
        }
    }, [isIframeMounted, onCritFail]);

    const handleClose = () => {
        setIsNetworkOpen(false);
    };

    return (
        <Modal
          id={idPrefix + "-modal"}
          aria-label={_("Configure network")}
          isOpen
          onClose={handleClose}
          showClose={false}
          className={idPrefix + "-modal-page-section"}
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
                <Button variant="secondary" onClick={handleClose}>
                    {_("Close")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
