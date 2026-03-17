/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext, useEffect, useState } from "react";

import { AvailabilityState } from "../helpers.js";

import { StorageContext } from "../../../../contexts/Common.jsx";

import {
    useMountPointConstraints,
    useOriginalDevices,
} from "../../../../hooks/Storage.jsx";

/** Shared availability for use-configured-storage (cockpit) and use-configured-storage-kickstart. args.scenarioId selects which. */
export const useAvailabilityConfiguredStorage = (args) => {
    const newMountPoints = args?.newMountPoints;
    const scenarioId = args?.scenarioId ?? "use-configured-storage";
    const [scenarioAvailability, setScenarioAvailability] = useState();
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const storageScenarioId = partitioning?.storageScenarioId;
    const mountPointConstraints = useMountPointConstraints();
    const devices = useOriginalDevices();

    useEffect(() => {
        const availability = new AvailabilityState();

        const currentPartitioningMatches = storageScenarioId === "use-configured-storage" ||
            storageScenarioId === "use-configured-storage-kickstart";
        availability.showReview = scenarioId !== "use-configured-storage-kickstart";
        // Kickstart: always show the option, no inline storage review;
        // cockpit: show when we have applied storage and scenario matches
        availability.hidden = !currentPartitioningMatches ||
         (!appliedPartitioning && scenarioId === "use-configured-storage");

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
    }, [appliedPartitioning, devices, mountPointConstraints, newMountPoints, scenarioId, storageScenarioId]);

    return scenarioAvailability;
};
