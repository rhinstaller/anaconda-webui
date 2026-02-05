/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext, useEffect, useState } from "react";

import { getAutopartReuseDBusRequest } from "../../../../apis/storage_partitioning.js";

import { debug as loggerDebug } from "../../../../helpers/log.js";
import {
    bootloaderTypes,
    hasReusableFedoraWithWindowsOS,
    isCompleteOSOnDisks,
} from "../../../../helpers/storage.js";
import { AvailabilityState } from "../helpers.js";

import { StorageContext } from "../../../../contexts/Common.jsx";

import {
    useHomeReuseOptions,
    useOriginalDevices,
    useOriginalExistingSystems,
} from "../../../../hooks/Storage.jsx";

const debug = loggerDebug.bind(null, "home reuse:");

export const useAvailabilityHomeReuse = () => {
    const [scenarioAvailability, setScenarioAvailability] = useState();
    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const originalExistingSystems = useOriginalExistingSystems();
    const { reuseEFIPart, scheme } = useHomeReuseOptions();

    useEffect(() => {
        const availability = new AvailabilityState();
        let reusedOS = null;
        const autopartScheme = scheme;

        availability.hidden = false;
        availability.available = !!selectedDisks.length;

        const getUnknownMountPoints = (scheme, existingOS) => {
            const reuseRequest = getAutopartReuseDBusRequest({ reuseEFIPart, scheme });
            const isBootloader = (device) => bootloaderTypes.includes(devices[device].formatData.type.v);
            // Ignore bootloader device mount points, they have special handling
            const existingMountPoints = Object.entries(existingOS["mount-points"].v)
                    .filter(mp => !isBootloader(mp[1]))
                    .map((mp) => mp[0]);

            const managedMountPoints = reuseRequest["reformatted-mount-points"].v
                    .concat(reuseRequest["reused-mount-points"].v, reuseRequest["removed-mount-points"].v);

            const unknownMountPoints = existingMountPoints.filter(i => !managedMountPoints.includes(i));
            return unknownMountPoints;
        };

        // Check that exactly one Linux OS is present and it is Fedora Linux
        // (Stronger check for mountpoints uniqueness is in the backend
        const linuxSystems = originalExistingSystems.filter(osdata => osdata["os-name"].v.includes("Linux"))
                .filter(osdata => isCompleteOSOnDisks(devices, selectedDisks, osdata));
        if (linuxSystems.length === 0) {
            availability.available = false;
            availability.hidden = true;
            debug("No existing Linux system found.");
        } else if (linuxSystems.length > 1) {
            availability.available = false;
            availability.hidden = true;
            debug("Multiple existing Linux systems found.");
        } else {
            reusedOS = linuxSystems[0];
            if (!linuxSystems.some(osdata => osdata["os-name"].v.includes("Fedora"))) {
                availability.available = false;
                availability.hidden = true;
                debug("No existing Fedora Linux system found.");
            }
        }

        // Check that no other than Linux system (Windows, MacOS) is found
        const allSystems = originalExistingSystems.filter(osdata => isCompleteOSOnDisks(devices, selectedDisks, osdata));
        if (allSystems.length > linuxSystems.length) {
            availability.available = false;
            availability.hidden = true;
            debug("Non-linux existing systems found.");
        }

        // Allow for a reusable Fedora with Windows system along
        if (hasReusableFedoraWithWindowsOS(devices, selectedDisks, originalExistingSystems)) {
            availability.available = true;
            availability.hidden = false;
            debug("Reusable Fedora with a Windows system along found.");
        }

        debug(`Default scheme is ${autopartScheme}.`);
        if (reusedOS) {
            // Check that required autopartitioning scheme matches reused OS.
            // Check just "/home". To be more generic we could check all reused devices except bootloader
            // (as the backend).
            const homeDevice = reusedOS["mount-points"].v["/home"];
            const homeDeviceType = devices[homeDevice]?.type.v;
            const requiredSchemeTypes = {
                BTRFS: "btrfs subvolume",
                LVM: "lvmlv",
                LVM_THINP: "lvmthinlv",
                PLAIN: "partition",
            };
            if (homeDeviceType !== requiredSchemeTypes[autopartScheme]) {
                availability.available = false;
                availability.hidden = true;
                debug(`No reusable existing Linux system found, reused devices must have ${requiredSchemeTypes[autopartScheme]} type`);
            }
        }

        if (reusedOS) {
            // Check that existing system does not have mountpoints unexpected
            // by the required autopartitioning scheme
            const unknownMountPoints = getUnknownMountPoints(autopartScheme, reusedOS);
            if (unknownMountPoints.length > 0) {
                availability.available = false;
                availability.hidden = true;
                debug(`Unknown existing mountpoints found ${unknownMountPoints}`);
            }
        }

        // TODO checks:
        // - luks - partitions are unlocked - enforce? allow opt-out?
        // - size ?

        setScenarioAvailability(availability);
    }, [devices, originalExistingSystems, reuseEFIPart, selectedDisks, scheme]);

    return scenarioAvailability;
};
