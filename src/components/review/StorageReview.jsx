/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext } from "react";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import {
    checkDeviceOnStorageType,
    getDeviceAncestors,
    getDeviceChildren,
    getParentPartitions,
    hasEncryptedAncestor,
    isBootloaderDevice,
    systemMountPoints,
} from "../../helpers/storage.js";

import {
    StorageContext,
} from "../../contexts/Common.jsx";

import {
    useFreeSpaceForSystem,
    useOriginalDevices,
    useOriginalExistingSystems,
    usePlannedActions,
    usePlannedDevices,
    usePlannedMountPoints,
    useRequiredSize,
} from "../../hooks/Storage.jsx";

import { ListingTable } from "cockpit-components-table.jsx";

import { ReviewDescriptionListItem } from "./Common.jsx";

import "./StorageReview.scss";

const _ = cockpit.gettext;
const idPrefix = "storage-review";

export const StorageReview = ({ isReviewScreen = false }) => {
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    return (
        <Stack hasGutter>
            {selectedDisks.map(disk => {
                return (
                    <DeviceRow
                      key={disk}
                      disk={disk}
                      isReviewScreen={isReviewScreen}
                    />
                );
            })}
        </Stack>
    );
};

const DeviceRow = ({ disk, isReviewScreen }) => {
    const { partitioning } = useContext(StorageContext);
    const originalDevices = useOriginalDevices();
    const actions = usePlannedActions();
    const mountPoints = usePlannedMountPoints();
    const devices = usePlannedDevices();
    const requiredSize = useRequiredSize();
    const freeSpace = useFreeSpaceForSystem();

    const requests = partitioning.requests;
    const deviceData = devices?.[disk];
    const reusedMountPoints = requests.find(request => request["reused-mount-points"])?.["reused-mount-points"];
    const plannedSystemMountPoints = Object.entries(mountPoints).filter(mp => systemMountPoints.includes(mp[0]));

    if (!deviceData) {
        return null;
    }

    let insufficientSizeMessage = "";
    if (requiredSize > freeSpace) {
        if (Object.keys(plannedSystemMountPoints).length === 1) {
            insufficientSizeMessage = cockpit.format(_("Needs at least $0"), cockpit.format_bytes(requiredSize));
        } else if (Object.keys(plannedSystemMountPoints).length > 1) {
            insufficientSizeMessage = _("May need more free space");
        }
    }

    const getDeviceRow = ([mount, device]) => {
        const size = cockpit.format_bytes(devices[device].size.v);
        const request = requests.find(request => request["device-spec"] === device);
        let format = devices[device].formatData.type.v;
        const isReformattedMountPoint = (!request && !reusedMountPoints?.includes(mount)) || request?.reformat;

        // If the format is btrfs, we want to show the type of the device (aka btrfs subvolume)
        if (format === "btrfs") {
            format = devices[device].type.v;
        }

        let action = null;
        if (isReformattedMountPoint && format) {
            action = cockpit.format(_("format as $0"), format);
        } else if (format === "biosboot") {
            action = format;
        } else {
            action = _("mount");
        }

        const parents = getParentPartitions(devices, device);
        const showMaybeType = () => {
            if (checkDeviceOnStorageType(devices, device, "lvmvg")) {
                return ", LVM";
            } else if (checkDeviceOnStorageType(devices, device, "mdarray")) {
                return ", RAID";
            } else {
                return "";
            }
        };

        const helperText = (
            systemMountPoints.includes(mount) && insufficientSizeMessage
                ? (
                    <HelperText id={`helper-disk-${disk}`} data-path={mount}>
                        <HelperTextItem variant="error">
                            {insufficientSizeMessage}
                        </HelperTextItem>
                    </HelperText>
                )
                : ""
        );

        return (
            {
                columns: [
                    { title: cockpit.format("$0$1", parents.join(", "), showMaybeType()), width: 17 },
                    { title: size, width: 15 },
                    { title: action, width: 17 },
                    { title: hasEncryptedAncestor(devices, device) ? (isReformattedMountPoint ? _("encrypt") : _("encrypted")) : "", width: 17 },
                    { title: mount, width: 17 },
                    ...(isReviewScreen ? [{ title: helperText, width: 17 }] : []),
                ],
                props: { key: device },
            }
        );
    };

    const getActionRow = action => {
        const device = action["device-name"].v;
        const actionType = action["action-type"].v;
        const actionDescription = action["action-description"].v;

        let sizeText = "";
        let actionDescriptionText = actionDescription;

        if (actionType === "destroy") {
            actionDescriptionText = _("delete");
        } else if (actionType === "resize") {
            const prevSize = cockpit.format_bytes(originalDevices[device].size.v);
            sizeText = cockpit.format_bytes(devices[device].size.v);

            actionDescriptionText = cockpit.format(_("resized from $0"), prevSize);
        }

        return (
            {
                columns: [
                    { title: device },
                    { title: sizeText },
                    {
                        props: { className: idPrefix + "-table-column-action-" + actionType },
                        title: actionDescriptionText,
                    },
                    { title: "" },
                    { title: "" },
                    ...(isReviewScreen ? [{ title: "" }] : []),
                ],
                props: {
                    key: device + actionType,
                },
            }
        );
    };

    const newMountPointRows = Object.entries(mountPoints).filter(mp => {
        const parents = getDeviceAncestors(devices, mp[1]);

        return parents.includes(disk) || mp[1] === disk;
    });

    // Add rows for every defined bootloader
    Object.keys(devices)
            .filter(device => isBootloaderDevice({ device, devices }))
            .forEach(blDev => {
                const parents = getDeviceAncestors(devices, blDev);
                if (parents.includes(disk) || blDev === disk) {
                    newMountPointRows.unshift(["", blDev]);
                }
            });

    const swap = Object.keys(devices).find(device => devices[device].formatData.type.v === "swap");
    if (swap) {
        const parents = getDeviceAncestors(devices, swap);

        if (parents.includes(disk) || swap === disk) {
            newMountPointRows.push(["swap", swap]);
        }
    }

    // For deleted device information we need to take a look at the original device tree
    const actionRows = actions.filter(action => {
        // Show only delete actions for partitions to not overload the summary with deleted children
        if (
            !["destroy", "resize"].includes(action["action-type"].v) ||
            action["object-description"].v !== "partition"
        ) {
            return false;
        }

        const parents = getDeviceAncestors(originalDevices, action["device-id"].v);

        return parents.includes(disk) || action["device-id"].v === disk;
    });

    return (
        <div>
            <span id={`disk-${disk}`}>{cockpit.format_bytes(deviceData.size.v)} {disk} {"(" + deviceData.description.v + ")"}</span>
            <ListingTable
              aria-label={_("Device tree for $0", disk)}
              className={"pf-m-no-border-rows " + idPrefix + "-table"}
              columns={[
                  { props: { screenReaderText: _("Device") } },
                  { props: { screenReaderText: _("Size") } },
                  { props: { screenReaderText: _("Actions") } },
                  { props: { screenReaderText: _("Encrypted") } },
                  { props: { screenReaderText: _("Mount point") } },
                  ...(isReviewScreen ? [{ props: { screenReaderText: _("Helper text") } }] : []),
              ]}
              gridBreakPoint=""
              id={idPrefix + "-table-" + disk}
              rows={[
                  ...actionRows.map(getActionRow),
                  ...newMountPointRows.map(getDeviceRow)
              ]}
              variant="compact"
            />

        </div>
    );
};

/**
 * @returns {boolean}   True is the device will be deleted according to the actions
 */
const isDeviceDeleted = ({ actions, device }) => (
    actions.find(action => action["device-id"].v === device && action["action-type"].v === "destroy")
);

/**
 * @returns {boolean}   True is the device will be resized according to the actions
 */
const isDeviceResized = ({ actions, device }) => (
    actions.find(action => action["device-id"].v === device && action["action-type"].v === "resize")
);

const DeletedSystems = () => {
    const originalExistingSystems = useOriginalExistingSystems();
    const plannedActions = usePlannedActions();

    const deletedSystems = originalExistingSystems.filter(
        system => system.devices.v.every(device => isDeviceDeleted({ actions: plannedActions, device }))
    );

    return deletedSystems.map(system => (
        <ListItem key={system["os-name"].v}>
            {cockpit.format(_("$0 will be deleted"), system["os-name"].v)}
        </ListItem>
    ));
};

const AffectedSystems = ({ type }) => {
    const originalExistingSystems = useOriginalExistingSystems();
    const originalDevices = useOriginalDevices();
    const plannedActions = usePlannedActions();

    const check = device => (
        type === "delete"
            ? isDeviceDeleted({ actions: plannedActions, device })
            : isDeviceResized({ actions: plannedActions, device })
    );

    const affectedSystems = originalExistingSystems.filter(
        system => {
            const systemDevices = system.devices.v;

            // If all partitions belonging to an OS are deleted the system is not handled
            // as affected but as deleted
            return (
                systemDevices.some(check) &&
                (type !== "delete" || !systemDevices.every(check))
            );
        }
    );

    const getAffectedDevicesText = system => {
        const affectedDevices = system.devices.v.filter(check);
        const affectedDevicesPartitiongMap = Object.keys(originalDevices).reduce((acc, device) => {
            if (originalDevices[device].type.v !== "partition") {
                return acc;
            }

            const children = getDeviceChildren({ device, deviceData: originalDevices });
            const affectedChildren = children.filter(child => affectedDevices.includes(child));

            if (affectedDevices.includes(device) || affectedChildren.length) {
                acc[device] = affectedChildren.map(child => originalDevices[child].name.v);
            }
            return acc;
        }, {});

        return Object.keys(affectedDevicesPartitiongMap)
                .map(device => {
                    const deviceName = originalDevices[device].name.v;
                    if (affectedDevicesPartitiongMap[device].length === 0) {
                        return deviceName;
                    }

                    return `${deviceName} (${affectedDevicesPartitiongMap[device].join(", ")})`;
                })
                .join(", ");
    };

    const deleteText = system => cockpit.format(
        _("Deletion of certain partitions may prevent $0 from booting: $1"),
        system["os-name"].v,
        getAffectedDevicesText(system)
    );

    const resizeText = system => cockpit.format(
        _("Resizing the following partitions from $0: $1"),
        system["os-name"].v,
        getAffectedDevicesText(system)
    );

    return affectedSystems.map(system => (
        <ListItem key={system["os-name"].v}>
            {type === "delete" && deleteText(system)}
            {type === "resize" && resizeText(system)}
        </ListItem>
    ));
};

export const StorageReviewNote = () => {
    const originalExistingSystems = useOriginalExistingSystems();
    const plannedActions = usePlannedActions();

    const hasNote = (
        originalExistingSystems.filter(
            system => system.devices.v.some(device => (
                isDeviceResized({ actions: plannedActions, device }) ||
                isDeviceDeleted({ actions: plannedActions, device }))
            )
        ).length
    );
    if (!hasNote) return null;

    const description = (
        <List isPlain>
            <DeletedSystems />
            <AffectedSystems type="delete" />
            <AffectedSystems type="resize" />
        </List>
    );

    return (
        <ReviewDescriptionListItem
          id="anaconda-screen-review-target-storage-note"
          term={_("Note")}
          description={description}
        />
    );
};
