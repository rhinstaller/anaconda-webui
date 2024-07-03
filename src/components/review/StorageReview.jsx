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

import React, { useContext, useEffect, useState } from "react";
import {
    List,
    ListItem,
    Stack,
} from "@patternfly/react-core";

import { getDeviceTree } from "../../apis/storage_partitioning.js";

import {
    checkDeviceOnStorageType,
    getDeviceAncestors,
    getDeviceChildren,
    getParentPartitions,
    hasEncryptedAncestor,
} from "../../helpers/storage.js";

import { ListingTable } from "cockpit-components-table.jsx";

import { StorageContext } from "../Common.jsx";
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

export const useDeviceTree = () => {
    const [deviceTreePath, setDeviceTreePath] = useState();
    const { appliedPartitioning, deviceTrees } = useContext(StorageContext);

    useEffect(() => {
        const _getDeviceTree = async () => {
            const _deviceTreePath = appliedPartitioning ? await getDeviceTree({ partitioning: appliedPartitioning }) : "";
            setDeviceTreePath(_deviceTreePath);
        };
        _getDeviceTree();
    }, [appliedPartitioning, deviceTrees]);

    return deviceTrees[deviceTreePath];
};

const usePlannedActions = () => {
    const actualDeviceTree = useDeviceTree();

    return actualDeviceTree ? actualDeviceTree.actions : [];
};

const useOriginalExistingSystems = () => {
    const { deviceTrees } = useContext(StorageContext);

    return deviceTrees[""] ? deviceTrees[""].existingSystems : [];
};

const DeviceRow = ({ disk }) => {
    const { deviceTrees, partitioning } = useContext(StorageContext);
    const actualDeviceTree = useDeviceTree();

    if (actualDeviceTree === undefined) {
        return null;
    }

    const { actions, devices, mountPoints } = actualDeviceTree;
    const requests = partitioning.requests;
    const deviceData = devices[disk];

    const getDeviceRow = ([mount, name]) => {
        const size = cockpit.format_bytes(devices[name].size.v);
        const request = requests.find(request => request["device-spec"] === name);
        const format = devices[name].formatData.type.v;
        const action = (
            request === undefined || request.reformat
                ? (format ? cockpit.format(_("format as $0"), format) : null)
                : ((format === "biosboot") ? format : _("mount"))
        );
        const parents = getParentPartitions(devices, name);
        const showMaybeType = () => {
            if (checkDeviceOnStorageType(devices, name, "lvmvg")) {
                return ", LVM";
            } else if (checkDeviceOnStorageType(devices, name, "mdarray")) {
                return ", RAID";
            } else {
                return "";
            }
        };

        return (
            {
                columns: [
                    { title: mount, with: 20 },
                    { title: cockpit.format("$0$1", parents.join(", "), showMaybeType()), width: 20 },
                    { title: size, width: 20 },
                    { title: action, width: 20 },
                    { title: hasEncryptedAncestor(devices, name) ? (!request || request.reformat ? _("encrypt") : _("encrypted")) : "", width: 20 },
                ],
                props: { key: name },
            }
        );
    };

    const getActionRow = action => {
        const actionType = action["action-description"].v === "destroy device" ? _("delete") : action["action-description"].v;

        return (
            {
                columns: [
                    { title: "" },
                    { title: action["device-name"].v },
                    { title: "" },
                    {
                        props: { className: idPrefix + "-table-column-action-" + action["action-type"].v },
                        title: actionType,
                    },
                    { title: "" },
                ],
                props: {
                    key: action["device-name"].v + action["action-type"].v,
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
    const originalDevices = deviceTrees[""].devices;
    const actionRows = actions.filter(action => {
        // Show only delete actions for partitions to not overload the summary with deleted children
        if (action["action-description"].v !== "destroy device" || action["object-description"].v !== "partition") {
            return false;
        }

        const parents = getDeviceAncestors(originalDevices, action["device-name"].v);

        return parents.includes(disk);
    });
    return (
        <div>
            <span id={`disk-${disk}`}>{cockpit.format_bytes(deviceData.size.v)} {disk} {"(" + deviceData.description.v + ")"}</span>
            <ListingTable
              aria-label={_("Device tree for $0", disk)}
              className={"pf-m-no-border-rows " + idPrefix + "-table"}
              columns={[
                  { props: { screenReaderText: _("Mount point") } },
                  { props: { screenReaderText: _("Device") } },
                  { props: { screenReaderText: _("Size") } },
                  { props: { screenReaderText: _("Actions") } },
                  { props: { screenReaderText: _("Encrypted") } }
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
    actions.find(action => action["device-name"].v === device && action["action-type"].v === "destroy")
);

export const StorageReviewNote = () => {
    const { deviceTrees } = useContext(StorageContext);
    const plannedActions = usePlannedActions();
    const originalExistingSystems = useOriginalExistingSystems();
    const originalDevices = deviceTrees[""].devices;

    const deletedSystems = originalExistingSystems.filter(
        system => system.devices.v.every(device => isDeviceDeleted({ actions: plannedActions, device }))
    );
    const affectedSystems = originalExistingSystems.filter(
        system => (
            system.devices.v.some(device => isDeviceDeleted({ actions: plannedActions, device })) &&
            !system.devices.v.every(device => isDeviceDeleted({ actions: plannedActions, device }))
        )
    );

    const getDeletedDevicesText = system => {
        const deletedDevices = system.devices.v.filter(device => isDeviceDeleted({ actions: plannedActions, device }));
        const deletedDevicesPartitiongMap = Object.keys(originalDevices).reduce((acc, device) => {
            if (originalDevices[device].type.v !== "partition") {
                return acc;
            }

            const children = getDeviceChildren({ device, deviceData: originalDevices });

            acc[device] = children.filter(child => deletedDevices.includes(child));
            return acc;
        }, {});

        return Object.keys(deletedDevicesPartitiongMap)
                .filter(device => deletedDevicesPartitiongMap[device].length > 0)
                .map(device => {
                    return `${device} (${deletedDevicesPartitiongMap[device].join(", ")})`;
                })
                .join(", ");
    };

    const description = (
        <List isPlain>
            {deletedSystems.map(system => (
                <ListItem key={system["os-name"].v}>
                    {cockpit.format(_("$0 will be deleted"), system["os-name"].v)}
                </ListItem>
            ))}
            {affectedSystems.map(system => (
                <ListItem key={system["os-name"].v}>
                    {cockpit.format(
                        _("Deletion of certain partitions may prevent $0 from booting: $1"),
                        system["os-name"].v,
                        getDeletedDevicesText(system)
                    )}
                </ListItem>
            ))}
        </List>
    );

    if (deletedSystems.length === 0 && affectedSystems.length === 0) {
        return null;
    }

    return (
        <ReviewDescriptionListItem
          id="installation-review-target-storage-note"
          term={_("Note")}
          description={description}
        />
    );
};
