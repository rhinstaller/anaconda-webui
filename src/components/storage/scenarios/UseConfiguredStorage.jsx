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

import { useContext, useEffect, useState } from "react";

import { AvailabilityState } from "./helpers.js";

import {
    StorageContext,
} from "../../../contexts/Common.jsx";

import {
    useMountPointConstraints,
    useOriginalDevices,
} from "../../../hooks/Storage.jsx";

import { helpConfiguredStorage } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

export const useAvailabilityConfiguredStorage = (args) => {
    const newMountPoints = args?.newMountPoints;
    const [scenarioAvailability, setScenarioAvailability] = useState();
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const storageScenarioId = partitioning?.storageScenarioId;
    const mountPointConstraints = useMountPointConstraints();
    const devices = useOriginalDevices();

    useEffect(() => {
        const availability = new AvailabilityState();

        const currentPartitioningMatches = storageScenarioId === "use-configured-storage";
        availability.showReview = true;
        availability.hidden = !appliedPartitioning || !currentPartitioningMatches;

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
        setScenarioAvailability(availability);
    }, [appliedPartitioning, devices, mountPointConstraints, newMountPoints, storageScenarioId]);

    return scenarioAvailability;
};

export const scenarioConfiguredStorage = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityConfiguredStorage,
    getButtonLabel: () => _("Install"),
    getDetail: helpConfiguredStorage,
    getLabel: () => _("Use configured storage"),
    id: "use-configured-storage",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
