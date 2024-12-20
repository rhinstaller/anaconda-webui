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

import React, { useContext } from "react";
import {
    List,
    ListItem,
    Stack,
} from "@patternfly/react-core";

import {
    checkDeviceOnStorageType,
    getDeviceAncestors,
    getDeviceChildren,
    getParentPartitions,
    hasEncryptedAncestor,
} from "../../helpers/storage.js";

import { ListingTable } from "cockpit-components-table.jsx";

import {
    StorageContext,
} from "../../contexts/Common.jsx";
import {
    useOriginalDevices,
    useOriginalExistingSystems,
    usePlannedActions,
    usePlannedDevices,
    usePlannedMountPoints,
} from "../storage/Common.jsx";
import { ReviewDescriptionListItem } from "./Common";

import "./StorageReview.scss";

const _ = cockpit.gettext;
const idPrefix = "storage-review";

export const StorageReview = () => {
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    return (
        <Stack hasGutter>
            {selectedDisks.map(disk => {
                return (
                    <DeviceRow
                      key={disk}
                      disk={disk}
                    />
                );
            })}
        </Stack>
    );
};

const DeviceRow = ({ disk }) => {
    const { partitioning } = useContext(StorageContext);
    const originalDevices = useOriginalDevices();
    const actions = usePlannedActions();
    const mountPoints = usePlannedMountPoints();
    const devices = usePlannedDevices();

    const requests = partitioning.requests;
    const deviceData = devices?.[disk];
    const reusedMountPoints = requests.find(request => request["reused-mount-points"])?.["reused-mount-points"];

    if (!deviceData) {
        return null;
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

        return (
            {
                columns: [
                    { title: cockpit.format("$0$1", parents.join(", "), showMaybeType()), width: 20 },
                    { title: size, width: 20 },
                    { title: action, width: 20 },
                    { title: hasEncryptedAncestor(devices, device) ? (isReformattedMountPoint ? _("encrypt") : _("encrypted")) : "", width: 20 },
                    { title: mount, with: 20 },
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

        if (actionDescription === "destroy device") {
            actionDescriptionText = _("delete");
        } else if (actionDescription === "resize device") {
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
                ],
                props: {
                    key: device + actionType,
                },
            }
        );
    };

    const newMountPointRows = Object.entries(mountPoints).filter(mp => {
        const parents = getDeviceAncestors(devices, mp[1]);

        return parents.includes(disk);
    });

    const swap = Object.keys(devices).find(device => devices[device].formatData.type.v === "swap");
    if (swap) {
        const parents = getDeviceAncestors(devices, swap);

        if (parents.includes(disk)) {
            newMountPointRows.push(["swap", swap]);
        }
    }

    // For deleted device information we need to take a look at the original device tree
    const actionRows = actions.filter(action => {
        // Show only delete actions for partitions to not overload the summary with deleted children
        if (
            !["destroy device", "resize device"].includes(action["action-description"].v) ||
            action["object-description"].v !== "partition"
        ) {
            return false;
        }

        const parents = getDeviceAncestors(originalDevices, action["device-id"].v);

        return parents.includes(disk);
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
          id="installation-review-target-storage-note"
          term={_("Note")}
          description={description}
        />
    );
};
