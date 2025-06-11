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

import { getAutopartReuseDBusRequest } from "../../../apis/storage_partitioning.js";

import {
    bootloaderTypes,
    hasReusableFedoraWithWindowsOS,
    isCompleteOSOnDisks,
} from "../../../helpers/storage.js";
import { debug as loggerDebug } from "../../../helpers/log.js";
import { AvailabilityState } from "./helpers.js";

import { StorageContext } from "../../../contexts/Common.jsx";

import {
    useHomeReuseOptions,
    useOriginalDevices,
    useOriginalExistingSystems,
} from "../../../hooks/Storage.jsx";

import { helpHomeReuse } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

const debug = loggerDebug.bind(null, "home reuse:");

const useAvailabilityHomeReuse = () => {
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
                console.info(`Unknown existing mountpoints found ${unknownMountPoints}`);
            }
        }

        // TODO checks:
        // - luks - partitions are unlocked - enforce? allow opt-out?
        // - size ?

        setScenarioAvailability(availability);
    }, [devices, originalExistingSystems, reuseEFIPart, selectedDisks, scheme]);

    return scenarioAvailability;
};

export const scenarioReinstallFedora = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityHomeReuse,
    getButtonLabel: () => _("Reinstall Fedora"),
    getDetail: helpHomeReuse,
    getLabel: () => _("Reinstall Fedora"),
    id: "home-reuse",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
