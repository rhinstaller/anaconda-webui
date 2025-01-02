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

import React from "react";

import { AvailabilityState } from "./helpers.js";

import { StorageReview } from "../../review/StorageReview.jsx";
import { helpConfiguredStorage } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

export const checkConfiguredStorage = ({
    devices,
    mountPointConstraints,
    newMountPoints,
    partitioning,
    storageScenarioId,
}) => {
    const availability = new AvailabilityState();

    const currentPartitioningMatches = storageScenarioId === "use-configured-storage";
    availability.hidden = partitioning === undefined || !currentPartitioningMatches;

    availability.available = (
        newMountPoints === undefined ||
        (
            mountPointConstraints
                    ?.filter(m => m.required.v)
                    .every(m => {
                        const allDirs = [];
                        const getNestedDirs = (object) => {
                            if (!object) {
                                return;
                            }
                            const { content, dir, subvolumes } = object;

                            if (dir) {
                                allDirs.push(dir);
                            }
                            if (content) {
                                getNestedDirs(content);
                            }
                            if (subvolumes) {
                                Object.keys(subvolumes).forEach(sv => getNestedDirs(subvolumes[sv]));
                            }
                        };

                        if (m["mount-point"].v) {
                            Object.keys(newMountPoints).forEach(key => getNestedDirs(newMountPoints[key]));

                            return allDirs.includes(m["mount-point"].v);
                        }

                        if (m["required-filesystem-type"].v === "biosboot") {
                            const biosboot = Object.keys(devices).find(d => devices[d].formatData.type.v === "biosboot");

                            return biosboot !== undefined;
                        }

                        return false;
                    })
        )
    );

    availability.review = <StorageReview />;

    return availability;
};

export const scenarioConfiguredStorage = {
    buttonLabel: _("Install"),
    buttonVariant: "danger",
    check: checkConfiguredStorage,
    default: false,
    detail: helpConfiguredStorage,
    id: "use-configured-storage",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    label: _("Use configured storage"),
};
