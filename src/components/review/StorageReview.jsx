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
import React from "react";

import {
    List, ListItem,
    Stack,
} from "@patternfly/react-core";

import { checkDeviceInSubTree } from "../../helpers/storage.js";

const _ = cockpit.gettext;

export const StorageReview = ({ selectedDisks, deviceData, requests, storageScenarioId }) => {
    return (
        <>
            {selectedDisks.map(disk => {
                return (
                    <DeviceRow
                      key={disk}
                      deviceData={deviceData}
                      disk={disk}
                      requests={["mount-point-mapping", "use-configured-storage"].includes(storageScenarioId) ? requests : null}
                    />
                );
            })}
        </>
    );
};

const DeviceRow = ({ deviceData, disk, requests }) => {
    const data = deviceData[disk];
    const name = data.name.v;

    const renderRow = row => {
        const name = row["device-spec"];
        const action = (
            row.reformat
                ? (row["format-type"] ? cockpit.format(_("format as $0"), row["format-type"]) : null)
                : ((row["format-type"] === "biosboot") ? row["format-type"] : _("mount"))
        );
        const mount = row["mount-point"] || null;
        const actions = [action, mount].filter(Boolean).join(", ");
        const size = cockpit.format_bytes(deviceData[name].size.v);

        return (
            <ListItem className="pf-v5-u-font-size-s" key={name}>
                {name}, {size}: {actions}
            </ListItem>
        );
    };

    const partitionRows = requests?.filter(req => {
        if (!req.reformat && req["mount-point"] === "") {
            return false;
        }

        return checkDeviceInSubTree({ device: req["device-spec"], rootDevice: name, deviceData });
    }).map(renderRow) || [];

    return (
        <Stack id={`disk-${name}`} hasGutter>
            <span>{cockpit.format_bytes(data.size.v)} {name} {"(" + data.description.v + ")"}</span>
            <List>
                {partitionRows}
            </List>
        </Stack>
    );
};
