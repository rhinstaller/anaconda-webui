/*
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
    HelperTextItem,
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

import React, { useContext, useEffect, useState } from "react";
import {
    Banner,
    Button,
    Content,
    DropdownItem,
    Flex,
    FlexItem,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalVariant,
    PageSection,
    Tooltip
} from "@patternfly/react-core";
import { ArrowLeftIcon, ExclamationTriangleIcon, TimesIcon } from "@patternfly/react-icons";

import {
    getDeviceAncestors
} from "../../../helpers/storage.js";

import { StorageContext, TargetSystemRootContext } from "../../../contexts/Common.jsx";

import {
    useMountPointConstraints,
    useOriginalDevices,
} from "../../../hooks/Storage.jsx";

import { CheckStorageDialog } from "./CheckStorageDialog.jsx";
import { ModifyStorageSideBar } from "./CockpitStorageIntegrationSidebar.jsx";

import "./CockpitStorageIntegration.scss";

const _ = cockpit.gettext;
const idPrefix = "cockpit-storage-integration";

const ReturnToInstallationButton = ({ onAction }) => (
    <Button
      icon={<ArrowLeftIcon />}
      id={idPrefix + "-return-to-installation-button"}
      variant="secondary"
      onClick={onAction}>
        {_("Return to installation")}
    </Button>
);

export const useMaybeBackdrop = () => {
    const [hasDialogOpen, setHasDialogOpen] = useState(false);

    useEffect(() => {
        const handleStorageEvent = (event) => {
            if (event.key === "cockpit_has_modal") {
                setHasDialogOpen(event.newValue === "true");
            }
        };

        window.addEventListener("storage", handleStorageEvent);

        return () => window.removeEventListener("storage", handleStorageEvent);
    }, []);

    return hasDialogOpen ? "cockpit-has-modal" : "";
};

const CockpitStorageConfirmationModal = ({ handleCancelOpenModal, handleConfirmOpenModal, showConfirmation }) => {
    return (
        <Modal
          isOpen={showConfirmation}
          onClose={handleCancelOpenModal}
          variant="small"
        >
            <ModalHeader
              title={_("Storage editor")}
              iconVariant="warning"
            />
            <ModalBody>
                <Content>
                    <Content component="p">
                        {_("The storage editor lets you resize, delete, and create partitions. It can set up LVM and much more. It is meant to be used as an advanced utility and not intended to be used in a typical installation.")}
                    </Content>
                    <Content component="strong">
                        {_("All changes made in the storage editor take effect immediately.")}
                    </Content>
                </Content>
            </ModalBody>
            <ModalFooter>
                <Button
                  id={idPrefix + "-enter-storage-confirm"}
                  key="confirm"
                  variant="warning"
                  onClick={handleConfirmOpenModal}>
                    {_("Launch storage editor")}
                </Button>
                <Button
                  id={idPrefix + "-enter-storage-cancel"}
                  key="cancel"
                  variant="link"
                  onClick={handleCancelOpenModal}>
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export const CockpitStorageIntegration = ({
    dispatch,
    onCritFail,
    setShowStorage,
}) => {
    const [showDialog, setShowDialog] = useState(false);
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const backdropClass = useMaybeBackdrop();
    const handleIframeLoad = () => setIsIframeMounted(true);

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("cockpit-storage-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Storage plugin failed"), isFrontend: true })({ message: exception.error.message, stack: exception.error.stack });
            });
            // set overflow-y to auto in order to allow scrolling if a menu gets positioned outside
            // the bounds of the viewport
            iframe.contentDocument.body.style["overflow-y"] = "auto";
        }
    }, [isIframeMounted, onCritFail]);

    const handleConfirmOpenModal = () => {
        setIsConfirmed(true);
        setShowStorage(true);
    };

    const handleCancelOpenModal = () => {
        setShowStorage(false);
        setIsConfirmed(false);
    };

    return (
        <>
            <CockpitStorageConfirmationModal
              handleCancelOpenModal={handleCancelOpenModal}
              handleConfirmOpenModal={handleConfirmOpenModal}
              showConfirmation={!isConfirmed}
            />
            <Modal
              aria-label={_("Configure storage")}
              className={backdropClass + " " + idPrefix + "-modal-page-section"}
              isOpen={isConfirmed}
              showClose={false}
              variant={ModalVariant.large}>
                <Banner screenReaderText="Warning banner" status="warning">
                    <Flex spaceItems={{ default: "spaceItemsSm" }}>
                        <FlexItem><ExclamationTriangleIcon /></FlexItem>
                        <FlexItem>
                            {
                                _("Changes made here will immediately affect the system. There is no 'undo'.")
                            }
                        </FlexItem>
                    </Flex>
                    <Button variant="plain" aria-label={_("Close storage editor")} onClick={() => setShowStorage(false)}>
                        <TimesIcon />
                    </Button>
                </Banner>
                <div className={idPrefix + "-page-section-cockpit-storage"}>
                    <PageSection hasBodyWrapper={false}>
                        <iframe
                          src="/cockpit/@localhost/storage/index.html"
                          name="cockpit-storage"
                          id="cockpit-storage-frame"
                          onLoad={handleIframeLoad}
                          className={idPrefix + "-iframe-cockpit-storage"} />
                    </PageSection>
                    <ModifyStorageSideBar />
                </div>
                {showDialog &&
                    <CheckStorageDialog
                      dispatch={dispatch}
                      onCritFail={onCritFail}
                      setShowDialog={setShowDialog}
                      setShowStorage={setShowStorage}
                    />}
                <ModalFooter>
                    <ReturnToInstallationButton onAction={() => setShowDialog(true)} />
                </ModalFooter>
            </Modal>
        </>
    );
};

export const ModifyStorage = ({ currentStepId, setShowStorage }) => {
    const targetSystemRoot = useContext(TargetSystemRootContext);
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const availableDevices = [
        ...diskSelection.selectedDisks,
        ...diskSelection.selectedDisks.map(disk => getDeviceAncestors(devices, disk)).flat(),
    ];
    const mountPointConstraints = useMountPointConstraints();
    const isEfi = mountPointConstraints?.some(c => c["required-filesystem-type"]?.v === "efi");
    const cockpitAnaconda = JSON.stringify({
        available_devices: availableDevices.map(device => devices[device].path.v),
        efi: isEfi,
        mount_point_prefix: targetSystemRoot,
    });
    // Allow to modify storage only when we are in the scenario selection page
    const isAriaDisabled = currentStepId !== "anaconda-screen-method";
    const item = (
        <DropdownItem
          id="modify-storage"
          isAriaDisabled={isAriaDisabled}
          onClick={() => {
              window.sessionStorage.setItem("cockpit_anaconda", cockpitAnaconda);
              setShowStorage(true);
          }}
        >
            {_("Launch storage editor")}
        </DropdownItem>
    );

    if (!isAriaDisabled) {
        return item;
    } else {
        return (
            <Tooltip
              id="modify-storage-tooltip"
              content={_("Storage editor is available only in the `Installation method` step.")}>
                <span>
                    {item}
                </span>
            </Tooltip>
        );
    }
};
