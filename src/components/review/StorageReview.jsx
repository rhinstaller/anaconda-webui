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
    Stack,
} from "@patternfly/react-core";

import { checkDeviceOnStorageType, getDeviceAncestors, getParentPartitions, hasEncryptedAncestor } from "../../helpers/storage.js";

import { ListingTable } from "cockpit-components-table.jsx";

import { StorageContext } from "../Common.jsx";

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
    const { devices, mountPoints, partitioning } = useContext(StorageContext);
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

    const tableDevicesRows = Object.entries(mountPoints).filter(mp => {
        const parents = getDeviceAncestors(devices, mp[1]);

        return parents.includes(disk);
    });
    const swap = Object.keys(devices).find(device => devices[device].formatData.type.v === "swap");
    if (swap) {
        const parents = getDeviceAncestors(devices, swap);

        if (parents.includes(disk)) {
            tableDevicesRows.push(["swap", swap]);
        }
    }

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
              rows={tableDevicesRows.map(getDeviceRow)}
              variant="compact"
            />

        </div>
    );
};
