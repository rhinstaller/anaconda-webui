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

import { fmt_to_fragments as fmtToFragments } from "utils";

import React, { useContext, useEffect, useState } from "react";
import { ActionList } from "@patternfly/react-core/dist/esm/components/ActionList/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { InputGroup, InputGroupItem, InputGroupText } from "@patternfly/react-core/dist/esm/components/InputGroup/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Panel } from "@patternfly/react-core/dist/esm/components/Panel/index.js";
import { Popover } from "@patternfly/react-core/dist/esm/components/Popover/index.js";
import { Slider } from "@patternfly/react-core/dist/esm/components/Slider/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";
import { CompressArrowsAltIcon } from "@patternfly/react-icons/dist/esm/icons/compress-arrows-alt-icon";
import { HddIcon } from "@patternfly/react-icons/dist/esm/icons/hdd-icon";
import { LockIcon } from "@patternfly/react-icons/dist/esm/icons/lock-icon";
import { OutlinedQuestionCircleIcon } from "@patternfly/react-icons/dist/esm/icons/outlined-question-circle-icon";
import { TrashIcon } from "@patternfly/react-icons/dist/esm/icons/trash-icon";
import { UndoIcon } from "@patternfly/react-icons/dist/esm/icons/undo-icon";

import { isDeviceShrinkable, removeDevice, shrinkDevice } from "../../../apis/storage_partitioning_automatic_resizable.js";

import { getDeviceAncestors, getDeviceTypeInfo, unitMultiplier } from "../../../helpers/storage.js";

import { StorageContext } from "../../../contexts/Common.jsx";

import { useDiskFreeSpace, useOriginalDevices, useOriginalExistingSystems, useRequiredSize } from "../../../hooks/Storage.jsx";

import { ModalError } from "cockpit-components-inline-notification.jsx";
import { ListingTable } from "cockpit-components-table.jsx";

import "./ReclaimSpaceModal.scss";

const _ = cockpit.gettext;
const idPrefix = "reclaim-space-modal";

export const ReclaimSpaceModal = ({ isFormDisabled, onClose, onNext }) => {
    const { diskSelection, partitioning } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const [dialogError, setDialogError] = useState();
    const [onNextClicked, setOnNextClicked] = useState(false);
    const [unappliedActions, setUnappliedActions] = useState(
        Object.keys(devices).reduce((acc, device) => { acc[device] = []; return acc }, {})
    );
    const rows = (
        diskSelection.selectedDisks
                .map(disk => getDeviceRow(disk, devices, 0, unappliedActions, setUnappliedActions))
                .flat(Infinity)
    );

    const onReclaim = async () => {
        for (const item of Object.entries(unappliedActions)) {
            const [device, actions] = item;

            // If device parent is removed we should not schedule any actions for this device
            if (isDeviceParentRemoved(device, devices, unappliedActions)) {
                continue;
            }

            for (const action of actions) {
                try {
                    if (action.type === "remove") {
                        await removeDevice({
                            device,
                            deviceTree: partitioning.deviceTree.path,
                        });
                    } else if (action.type === "shrink") {
                        await shrinkDevice({
                            device,
                            deviceTree: partitioning.deviceTree.path,
                            newSize: action.value,
                        });
                    }
                } catch (error) {
                    if (action.type === "remove") {
                        setDialogError({ ...error, text: cockpit.format(_("Unable to schedule deletion of $0"), device) });
                    } else if (action.type === "shrink") {
                        setDialogError({ ...error, text: cockpit.format(_("Unable to schedule resizing of $0"), device) });
                    }

                    return;
                }
            }
        }
        setOnNextClicked(true);
    };

    useEffect(() => {
        // Call the onNextClicked only once the form is not disabled
        // otherwise it silently fails
        if (onNextClicked && !isFormDisabled) {
            onNext();
            setOnNextClicked(false);
        }
    }, [onNextClicked, isFormDisabled, onNext]);

    return (
        <Modal
          id={idPrefix}
          isOpen
          onClose={onClose}
          variant={ModalVariant.large}
        >
            <ModalHeader
              title={_("Reclaim space")}
              description={
                  <Stack hasGutter>
                      <Content>
                          <Content component="p">{_("Remove or resize existing filesystems to free up space for the installation.")}</Content>
                          <Content component="p">{
                              _("Removing a filesystem will permanently delete all of the data it contains. Resizing a partition can free up unused space, but is not risk-free. Be sure to have backups of anything important before reclaiming space.")
                          }
                          </Content>
                      </Content>
                      <WindowsHint />
                  </Stack>
              }
            />
            <ModalBody>
                <Stack hasGutter>
                    {dialogError && <ModalError variant="warning" dialogError={dialogError.text} dialogErrorDetail={dialogError.message} />}
                    <Panel variant="bordered">
                        <ListingTable
                          isStickyHeader
                          aria-label={_("Reclaim space")}
                          columns={[
                              { props: { width: 20 }, title: _("Location") },
                              { props: { width: 20 }, title: _("Name") },
                              { props: { width: 20 }, title: _("Type") },
                              { props: { width: 20 }, title: _("Space") },
                              { props: { width: 20 }, title: _("Actions") }
                          ]}
                          emptyCaption={_("No devices")}
                          id={idPrefix + "-table"}
                          rows={rows}
                          variant="compact"
                        />
                    </Panel>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <ReclaimFooter isFormDisabled={isFormDisabled} unappliedActions={unappliedActions} onReclaim={onReclaim} onClose={onClose} />
            </ModalFooter>
        </Modal>
    );
};

const isDeviceRemoved = (device, unappliedActions) => (
    unappliedActions[device].map(_action => _action.type).includes("remove")
);

const isDeviceResized = (device, unappliedActions) => (
    unappliedActions[device].map(_action => _action.type).includes("shrink")
);

const isDeviceParentRemoved = (device, devices, unappliedActions) => (
    getDeviceAncestors(devices, device).some(dev => isDeviceRemoved(dev, unappliedActions))
);

const getReclaimableSpaceFromAction = ({ action, devices, unappliedActions }) => {
    if (action === "remove") {
        return Object.keys(unappliedActions)
                .filter(device => isDeviceRemoved(device, unappliedActions) && !isDeviceParentRemoved(device, devices, unappliedActions))
                .reduce((acc, device) => acc + devices[device].total.v - devices[device].free.v, 0);
    }

    if (action === "shrink") {
        return Object.keys(unappliedActions)
                .filter(device => isDeviceResized(device, unappliedActions) && !isDeviceParentRemoved(device, devices, unappliedActions))
                .reduce((acc, device) => acc + unappliedActions[device].reduce((acc, action) => acc + devices[device].total.v - action.value, 0), 0);
    }
};

const ReclaimFooter = ({ isFormDisabled, onClose, onReclaim, unappliedActions }) => {
    const devices = useOriginalDevices();
    const diskFreeSpace = useDiskFreeSpace();
    const requiredSize = useRequiredSize();
    const selectedSpaceToDelete = getReclaimableSpaceFromAction({ action: "remove", devices, unappliedActions });
    const selectedSpaceToShrink = getReclaimableSpaceFromAction({ action: "shrink", devices, unappliedActions });
    const selectedSpaceToReclaim = selectedSpaceToDelete + selectedSpaceToShrink;
    const status = (diskFreeSpace + selectedSpaceToReclaim) < requiredSize ? "warning" : "success";

    return (
        <Stack hasGutter>
            <HelperText>
                <HelperTextItem id={idPrefix + "-hint"} variant={status}>
                    {fmtToFragments(
                        _("Available free space: $0. Installation requires: $1."),
                        <b id={idPrefix + "-hint-available-free-space"}>{cockpit.format_bytes(diskFreeSpace + selectedSpaceToReclaim)}</b>,
                        <b id={idPrefix + "-hint-required-free-space"}>{cockpit.format_bytes(requiredSize)}</b>
                    )}
                </HelperTextItem>
            </HelperText>
            <ActionList>
                <Button isAriaDisabled={status === "warning" || isFormDisabled} key="reclaim" variant="warning" onClick={onReclaim}>
                    {_("Reclaim space")}
                </Button>
                <Button key="cancel" variant="link" onClick={onClose}>
                    {_("Cancel")}
                </Button>
            </ActionList>
        </Stack>
    );
};

/**
 * @param {object}      device
 * @returns {Boolean}   true if the device is locked (LUKS or bitlocker)
 **/
const isDeviceLocked = ({ device }) => {
    return (
        device.formatData.type.v === "bitlocker" ||
        (device.formatData.type.v === "luks" && device.formatData.attrs.v.has_key !== "True")
    );
};

const ExtendedPartitionType = ({ deviceName }) => (
    <Flex
      alignItems={{ default: "alignItemsCenter" }}
      className="extended-partition-type"
      flexWrap={{ default: "nowrap" }}
      spaceItems={{ default: "spaceItemsSm" }}
    >
        <FlexItem>
            {_("extended partition")}
        </FlexItem>
        <FlexItem>
            <Popover
              aria-label={_("Extended partition")}
              bodyContent={
                  fmtToFragments(
                      _("$0 is an MBR extended partition that contains logical partitions. Removing all logical partitions will also automatically remove the extended partition."),
                      <b>{deviceName}</b>
                  )
              }
              headerContent={_("Extended partition")}
              position="top"
            >
                <OutlinedQuestionCircleIcon />
            </Popover>
        </FlexItem>
    </Flex>
);

const getDeviceRow = (disk, devices, level = 0, unappliedActions, setUnappliedActions) => {
    const device = devices[disk];
    const isDisk = device["is-disk"].v;
    const isPartition = device.type.v === "partition";
    const typeLabel = device.attrs?.v["partition-type-name"] || "";
    // Disable the remove action for partitions without children witch are not lead nodes
    const isExtendedPartition = device.attrs?.v.isleaf === "False" && device.children.v.length === 0;
    const diskDescription = (
        <>
            <HddIcon />
            {cockpit.format("$0 ($1)", device.name.v, device.description.v)}
        </>
    );
    const classNames = [
        idPrefix + "-table-row",
        idPrefix + "-device-level-" + level,
    ];

    const isLastChild = device.attrs?.v.isleaf === "True";

    if (isLastChild) {
        classNames.push(idPrefix + "-device-leaf");
    }

    let deviceType = getDeviceTypeInfo(device);
    if (isDeviceLocked({ device })) {
        deviceType = (
            <Flex
              className={idPrefix + "-device-locked"}
              spaceItems={{ default: "spaceItemsSm" }}
              alignItems={{ default: "alignItemsCenter" }}
              flexWrap={{ default: "nowrap" }}
            >
                <FlexItem>{deviceType}</FlexItem>
                <FlexItem><LockIcon /></FlexItem>
            </Flex>
        );
    }

    if (isExtendedPartition) {
        deviceType = (
            <ExtendedPartitionType deviceName={device.name.v} />
        );
    }

    const size = level < 2 && !isExtendedPartition ? cockpit.format_bytes(device.total.v) : "";
    const deviceActions = (
        <DeviceActions
          device={device}
          isExtendedPartition={isExtendedPartition}
          level={level}
          unappliedActions={unappliedActions}
          setUnappliedActions={setUnappliedActions}
        />
    );

    return [
        {
            columns: [
                { props: { colSpan: isDisk ? 2 : 1 }, title: isDisk ? diskDescription : (isPartition ? device.name.v : "") },
                ...!isDisk ? [{ title: isPartition ? typeLabel : device.name.v }] : [],
                { title: deviceType },
                { title: size },
                { title: deviceActions }
            ],
            props: { className: classNames.join(" "), key: disk },
        },
        ...device.children.v.map((child) => getDeviceRow(child, devices, level + 1, unappliedActions, setUnappliedActions))
    ];
};

const getDeviceActionOfType = ({ device, type, unappliedActions }) => {
    return unappliedActions[device].find(action => action.type === type);
};

const DeviceActions = ({ device, isExtendedPartition, level, setUnappliedActions, unappliedActions }) => {
    // Only show actions for disks and the first level of partitions, or not extended
    // This is to simplify the feature for the first iteration
    if (level > 1 || isExtendedPartition) {
        return null;
    }

    const deviceId = device["device-id"].v;
    const parents = device.parents.v;
    const parentHasRemove = parents?.some((parent) => getDeviceActionOfType({ device: parent, type: "remove", unappliedActions }));
    const hasBeenRemoved = parentHasRemove || getDeviceActionOfType({ device: deviceId, type: "remove", unappliedActions });
    const newDeviceSize = getDeviceActionOfType({ device: deviceId, type: "shrink", unappliedActions })?.value;
    const hasUnappliedActions = !parentHasRemove && unappliedActions[deviceId].length > 0;

    const onAction = (action, value = "") => {
        setUnappliedActions((prevUnappliedActions) => {
            const _unappliedActions = { ...prevUnappliedActions };
            _unappliedActions[deviceId].push({ type: action, value });

            return _unappliedActions;
        });
    };
    const onUndo = () => {
        setUnappliedActions((prevUnappliedActions) => {
            const _unappliedActions = { ...prevUnappliedActions };
            _unappliedActions[deviceId].pop();

            return _unappliedActions;
        });
    };
    const deviceActionProps = {
        device,
        hasBeenRemoved,
        newDeviceSize,
        onAction,
    };

    return (
        <Flex spaceItems={{ default: "spaceItemsXs" }} className="reclaim-actions">
            <DeviceActionShrink {...deviceActionProps} />
            <DeviceActionDelete {...deviceActionProps} />
            {hasUnappliedActions && <Button variant="plain" icon={<UndoIcon />} onClick={onUndo} aria-label={_("undo")} />}
        </Flex>
    );
};

const DeleteText = () => (
    <span className={idPrefix + "-device-action-delete"}>{_("delete")}</span>
);

const DeviceActionDelete = ({ device, hasBeenRemoved, newDeviceSize, onAction }) => {
    const onRemove = () => onAction("remove");

    // Disable the remove action for disk devices without partitions
    const isRemoveDisabled = device.type.v === "disk" && device.children.v.length === 0;

    // Do not show 'delete' text for disks directly, we show 'delete' text for the contained partitions
    const deleteText = device.type.v !== "disk" ? <DeleteText /> : "";
    const deleteButton = (
        <Button
          aria-label={_("delete")}
          icon={<TrashIcon />}
          isAriaDisabled={isRemoveDisabled}
          onClick={onRemove}
          variant="plain"
        />
    );

    if (newDeviceSize !== undefined) {
        return null;
    }

    return (
        hasBeenRemoved
            ? deleteText
            : deleteButton
    );
};

const ShrinkText = ({ newDeviceSize }) => (
    <span className={idPrefix + "-device-action-shrink"}>
        {cockpit.format(_("shrink to $0"), cockpit.format_bytes(newDeviceSize))}
    </span>
);

const useIsDeviceShrinkable = ({ device }) => {
    const { partitioning } = useContext(StorageContext);
    const [isShrinkable, setIsShrinkable] = useState(undefined);

    useEffect(() => {
        const getIsShrinkable = async () => {
            const isShrinkable = await isDeviceShrinkable({
                device,
                deviceTree: partitioning.deviceTree.path,
            });

            setIsShrinkable(isShrinkable);
        };
        getIsShrinkable();
    }, [device, partitioning.deviceTree.path]);

    return isShrinkable;
};

const DeviceActionShrink = ({ device, hasBeenRemoved, newDeviceSize, onAction }) => {
    const onShrink = value => onAction("shrink", value);
    const isDeviceShrinkable = useIsDeviceShrinkable({ device: device["device-id"].v });
    const shrinkButton = <ShrinkPopover device={device} isAriaDisabled={!isDeviceShrinkable} onShrink={onShrink} />;

    if (hasBeenRemoved) {
        return null;
    }

    return (
        newDeviceSize
            ? <ShrinkText newDeviceSize={newDeviceSize} />
            : (device.type.v !== "disk" && shrinkButton)
    );
};

const ShrinkPopover = ({ device, isAriaDisabled, onShrink }) => {
    const [value, setValue] = useState(device.total.v);
    const originalValue = cockpit.format_bytes(device.total.v, { separate: true })[0];
    const originalUnit = cockpit.format_bytes(device.total.v, { separate: true })[1];
    const [inputValue, setInputValue] = useState(originalValue);

    // Patternfly slider accepts only english locale for the input value
    // FIXME: https://github.com/patternfly/patternfly/issues/7889
    // Therefore let's use a seperate TextInput component for the input value
    const normalizedValue = inputValue.toString().replace(",", ".");

    const shrinkButton = <Button variant="plain" isAriaDisabled={isAriaDisabled} icon={<CompressArrowsAltIcon />} aria-label={_("shrink")} />;

    return (
        <Popover
          aria-label={_("shrink")}
          id={idPrefix + "-shrink"}
          hasAutoWidth
          bodyContent={() => (
              <Flex
                alignItems={{ default: "alignItemsFlexStart" }}
                spaceItems={{ default: "spaceItemsMd" }}
              >
                  <Slider
                    areCustomStepsContinuous
                    className={idPrefix + "-shrink-slider"}
                    id={idPrefix + "-shrink-slider"}
                    inputLabel={originalUnit}
                    value={value * 100 / device.total.v}
                    showBoundaries={false}
                    onChange={(_, sliderValue) => {
                        const newValue = Math.round((sliderValue / 100) * device.total.v);
                        setValue(newValue);
                        setInputValue(cockpit.format_bytes(newValue, originalUnit, { separate: true })[0]);
                    }}
                    customSteps={[
                        { label: "0", value: 0 },
                        { label: cockpit.format_bytes(device.total.v), value: 100 },
                    ]}
                  />
                  <InputGroup>
                      <InputGroupItem>
                          <TextInput
                            value={inputValue}
                            onChange={(_event, val) => setInputValue(val)}
                            onBlur={() => {
                                const newValue = Math.min(device.total.v, Math.max(0, normalizedValue * unitMultiplier[originalUnit]));
                                if (Number.isNaN(newValue)) {
                                    setInputValue(cockpit.format_bytes(value, originalUnit, { separate: true })[0]);
                                    return;
                                }
                                setValue(newValue);
                                setInputValue(cockpit.format_bytes(newValue, originalUnit, { separate: true })[0]);
                            }}
                            id={idPrefix + "-shrink-input"}
                          />
                      </InputGroupItem>
                      <InputGroupText>{originalUnit}</InputGroupText>
                  </InputGroup>
                  <Button
                    id={idPrefix + "-shrink-button"}
                    variant="primary"
                    isAriaDisabled={value === 0 || value === device.total.v}
                    onClick={() => onShrink(value)}>
                      {_("Resize")}
                  </Button>
              </Flex>
          )}
        >
            {shrinkButton}
        </Popover>
    );
};

const WindowsHint = () => {
    const devices = useOriginalDevices();
    const originalExistingSystems = useOriginalExistingSystems();
    const requiredSize = useRequiredSize();
    const windows = originalExistingSystems.find(itm => itm["os-name"].v === "Windows");

    if (windows?.devices.v.find(itm => devices[itm].formatData.type.v === "bitlocker")) {
        return (
            <Alert variant="warning" isInline title={_("Windows partitions with BitLocker encryption cannot be resized")}>
                {cockpit.format(
                    _("Reboot into Windows to resize BitLocker-encrypted partitions. Make at least $0 of free space available for installation."),
                    cockpit.format_bytes(requiredSize)
                )}
            </Alert>
        );
    }
};
