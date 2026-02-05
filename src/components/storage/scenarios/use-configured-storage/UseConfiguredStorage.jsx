/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext, useEffect, useState } from "react";

import { AvailabilityState } from "../helpers.js";

import {
    StorageContext,
} from "../../../../contexts/Common.jsx";

import {
    useMountPointConstraints,
    useOriginalDevices,
} from "../../../../hooks/Storage.jsx";

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
