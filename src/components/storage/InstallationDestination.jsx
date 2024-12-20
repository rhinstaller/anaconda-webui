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

import React, { useContext, useEffect, useRef, useState } from "react";
import {
    Button,
    Divider,
    Flex,
    FlexItem,
    FormGroup,
    FormSection,
    Menu,
    MenuContent,
    MenuItem,
    MenuList,
    Modal,
    Stack,
    Title,
} from "@patternfly/react-core";
import { SyncAltIcon } from "@patternfly/react-icons";

import {
    runStorageTask,
    scanDevicesWithTask,
} from "../../apis/storage.js";
import { setSelectedDisks } from "../../apis/storage_disks_selection.js";
import { resetPartitioning } from "../../apis/storage_partitioning.js";

import { getDevicesAction, getDiskSelectionAction } from "../../actions/storage-actions.js";

import { debug } from "../../helpers/log.js";
import { getDeviceChildren } from "../../helpers/storage.js";
import { checkIfArraysAreEqual } from "../../helpers/utils.js";

import { EmptyStatePanel } from "cockpit-components-empty-state.jsx";

import { StorageContext, SystemTypeContext } from "../../contexts/Common.jsx";
import { useOriginalDevices, useOriginalExistingSystems } from "./Common.jsx";

import "./InstallationDestination.scss";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

/**
 *  Select default disks for the partitioning.
 *
 * If there are some usable disks already selected, show these.
 * In the automatic installation, select all disks. In
 * the interactive installation, select a disk if there
 * is only one available.
 * @return: the list of selected disks
 */
const selectDefaultDisks = ({ ignoredDisks, selectedDisks, usableDisks }) => {
    if (selectedDisks.length && selectedDisks.some(disk => usableDisks.includes(disk))) {
        // Filter the selection by checking the usable disks if there are some disks selected
        debug("Selecting disks selected in backend:", selectedDisks.join(","));
        return selectedDisks.filter(disk => usableDisks.includes(disk));
    } else {
        const availableDisks = usableDisks.filter(disk => !ignoredDisks.includes(disk));
        debug("Selecting one or less disks by default:", availableDisks.join(","));

        // Select a usable disk if there is only one available
        if (availableDisks.length === 1) {
            return availableDisks;
        }
        return [];
    }
};

const DeviceExistingInstallation = ({ device }) => {
    const originalExistingSystems = useOriginalExistingSystems();
    const devices = useOriginalDevices();
    const children = getDeviceChildren({ device, deviceData: devices });
    const existingSystemsOnDevice = originalExistingSystems.filter(
        system => system.devices.v.some(device => children.includes(device))
    );

    if (existingSystemsOnDevice.length === 0) {
        return null;
    }

    return (
        cockpit.format(
            _("Currently installed: $0"),
            existingSystemsOnDevice.map(system => system["os-name"].v).join(", ")
        )
    );
};

const LocalDisksSelect = ({
    dispatch,
    idPrefix,
    isRescanningDisks,
    onCritFail,
    setIsRescanningDisks,
    setUnappliedSelection,
    unappliedSelection,
}) => {
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();

    const onSelect = (event, disk) => {
        if (disk === "rescan") {
            return;
        }

        const newSelection = unappliedSelection.includes(disk)
            ? unappliedSelection.filter(selectedDisk => selectedDisk !== disk)
            : unappliedSelection.concat(disk);

        setUnappliedSelection(newSelection);
    };

    const rescanErrorHandler = onCritFail({
        context: N_("Rescanning of the disks failed.")
    });
    const onClickRescan = () => rescanDisks(
        setIsRescanningDisks,
        dispatch,
        rescanErrorHandler,
    );

    const rescanDisksButton = (
        <Button
          icon={!isRescanningDisks && <SyncAltIcon />}
          className={idPrefix + "-disk-selection-rescan"}
          id={idPrefix + "-rescan-disks"}
          isDisabled={isRescanningDisks}
          isInline
          isLoading={isRescanningDisks}
          onClick={onClickRescan}
          variant="link"
        >
            {_("Rescan devices")}
        </Button>
    );

    return (
        <Stack className={idPrefix + "-disk-selection-stack"}>
            {rescanDisksButton}
            <Divider />
            {diskSelection.usableDisks.length === 0 && (
                <EmptyStatePanel paragraph={_("No disks available")} />
            )}
            {diskSelection.usableDisks.length > 0 &&
            <>
                <Menu
                  isScrollable
                  isPlain
                  onSelect={onSelect}
                  selected={unappliedSelection}
                >
                    <MenuContent>
                        <MenuList>
                            {diskSelection.usableDisks.map(disk => (
                                <MenuItem
                                  description={
                                      <Flex spaceItems={{ default: "spaceItemsSm" }}>
                                          <FlexItem>
                                              {cockpit.format(
                                                  _("$0 $1"),
                                                  cockpit.format_bytes(devices[disk]?.total.v),
                                                  devices[disk]?.type.v
                                              )}
                                          </FlexItem>
                                          <FlexItem>
                                              <DeviceExistingInstallation device={disk} />
                                          </FlexItem>
                                      </Flex>
                                  }
                                  hasCheckbox
                                  id={idPrefix + "-disk-selection-menu-item-" + disk}
                                  isDisabled={isRescanningDisks}
                                  isSelected={unappliedSelection.includes(disk)}
                                  itemId={disk}
                                  key={disk}
                                >
                                    <Flex spaceItems={{ default: "spaceItemsSm" }}>
                                        <FlexItem>
                                            {cockpit.format(
                                                _("$0 ($1)"),
                                                devices[disk]?.description.v,
                                                devices[disk]?.name.v
                                            )}
                                        </FlexItem>
                                    </Flex>
                                </MenuItem>
                            ))}
                        </MenuList>
                    </MenuContent>
                </Menu>
            </>}
        </Stack>
    );
};

const rescanDisks = (setIsRescanningDisks, dispatch, errorHandler) => {
    setIsRescanningDisks(true);
    scanDevicesWithTask()
            .then(task => {
                return runStorageTask({
                    onFail: exc => {
                        setIsRescanningDisks(false);
                        errorHandler(exc);
                    },
                    onSuccess: () => resetPartitioning()
                            .then(() => Promise.all([
                                dispatch(getDevicesAction()),
                                dispatch(getDiskSelectionAction())
                            ]))
                            .finally(() => {
                                setIsRescanningDisks(false);
                            })
                            .catch(errorHandler),
                    task
                });
            });
};

export const InstallationDestination = ({
    dispatch,
    idPrefix,
    onCritFail,
    setIsFormValid,
}) => {
    const refUsableDisks = useRef();
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();

    debug("DiskSelector: devices: ", JSON.stringify(Object.keys(devices)), ", diskSelection: ", JSON.stringify(diskSelection));

    useEffect(() => {
        refUsableDisks.current = false;
    }, [diskSelection.usableDisks]);

    useEffect(() => {
        // Select default disks for the partitioning on component mount
        if (refUsableDisks.current === true) {
            return;
        }

        refUsableDisks.current = true;

        const defaultDisks = selectDefaultDisks({
            ignoredDisks: diskSelection.ignoredDisks,
            selectedDisks: diskSelection.selectedDisks,
            usableDisks: diskSelection.usableDisks,
        });

        if (!checkIfArraysAreEqual(diskSelection.selectedDisks, defaultDisks)) {
            setSelectedDisks({ drives: defaultDisks });
        }
    }, [diskSelection]);

    const selectedDisksCnt = diskSelection.selectedDisks.length;

    useEffect(() => {
        setIsFormValid(selectedDisksCnt > 0);
    }, [selectedDisksCnt, setIsFormValid]);

    const headingLevel = isBootIso ? "h2" : "h3";

    return (
        <FormSection
          title={<Title headingLevel={headingLevel} id={idPrefix + "-disk-selector-title"}>{_("Destination")}</Title>}
        >
            <FormGroup>
                <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsSm" }}>
                    {diskSelection.selectedDisks.length === 0 && (
                        <FlexItem>
                            {_("No disks selected")}
                        </FlexItem>
                    )}
                    {diskSelection.selectedDisks.map(disk => (
                        <Flex key={disk} id={idPrefix + "-target-disk-" + disk}>
                            <FlexItem>
                                {cockpit.format(
                                    _("$0 ($1)"),
                                    devices[disk]?.description.v,
                                    devices[disk]?.name.v
                                )}
                            </FlexItem>
                            <FlexItem className={idPrefix + "-target-disk-size"}>
                                {cockpit.format(
                                    _("$0 $1"),
                                    cockpit.format_bytes(devices[disk]?.total.v),
                                    devices[disk]?.type.v
                                )}
                            </FlexItem>
                            <FlexItem className={idPrefix + "-target-disk-existing-os"}>
                                <DeviceExistingInstallation device={disk} />
                            </FlexItem>
                        </Flex>
                    ))}
                    <ChangeDestination dispatch={dispatch} idPrefix={idPrefix} onCritFail={onCritFail} />
                </Flex>
            </FormGroup>
        </FormSection>
    );
};

const ChangeDestination = ({ dispatch, idPrefix, onCritFail }) => {
    const [isRescanningDisks, setIsRescanningDisks] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { diskSelection } = useContext(StorageContext);
    const [unappliedSelection, setUnappliedSelection] = useState(diskSelection.selectedDisks);

    const onSave = () => {
        setSelectedDisks({ drives: unappliedSelection });
        setIsModalOpen(false);
    };

    return (
        <>
            <Button variant="link" id={idPrefix + "-change-destination-button"} isInline onClick={() => setIsModalOpen(true)}>
                {_("Change destination")}
            </Button>
            {isModalOpen && (
                <Modal
                  id={idPrefix + "-change-destination-modal"}
                  position="top" variant="small" isOpen onClose={() => setIsModalOpen(false)}
                  title={_("Select destination")}
                  footer={
                      <>
                          {diskSelection.usableDisks.length > 0 && (
                              <>
                                  <Button isDisabled={isRescanningDisks} variant="primary" onClick={onSave}>
                                      {_("Select")}
                                  </Button>
                                  <Button isDisabled={isRescanningDisks} variant="link" onClick={() => setIsModalOpen(false)}>
                                      {_("Cancel")}
                                  </Button>
                              </>)}
                          {diskSelection.usableDisks.length === 0 && (
                              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                  {_("Close")}
                              </Button>
                          )}
                      </>
                  }>
                    <LocalDisksSelect
                      dispatch={dispatch}
                      idPrefix={idPrefix}
                      isRescanningDisks={isRescanningDisks}
                      unappliedSelection={unappliedSelection}
                      onCritFail={onCritFail}
                      setUnappliedSelection={setUnappliedSelection}
                      setIsRescanningDisks={setIsRescanningDisks}
                    />
                </Modal>
            )}
        </>
    );
};
