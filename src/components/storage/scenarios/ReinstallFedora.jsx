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

import { debug } from "../../../helpers/log.js";
import { bootloaderTypes, getDeviceAncestors } from "../../../helpers/storage.js";
import { AvailabilityState } from "./helpers.js";

import { StorageContext, StorageDefaultsContext } from "../../../contexts/Common.jsx";

import {
    useOriginalDevices,
    useOriginalExistingSystems,
} from "../../../hooks/Storage.jsx";

import { helpHomeReuse } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

const useAvailabilityHomeReuse = () => {
    const [scenarioAvailability, setScenarioAvailability] = useState();
    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const originalExistingSystems = useOriginalExistingSystems();
    const { defaultScheme } = useContext(StorageDefaultsContext);

    useEffect(() => {
        const availability = new AvailabilityState();
        let reusedOS = null;
        const autopartScheme = defaultScheme;

        availability.hidden = false;
        availability.available = !!selectedDisks.length;

        const isCompleteOSOnDisks = (osData, disks) => {
            const osDisks = osData.devices.v.map(deviceId => getDeviceAncestors(devices, deviceId))
                    .reduce((disks, ancestors) => disks.concat(ancestors))
                    .filter(dev => devices[dev].type.v === "disk")
                    .reduce((uniqueDisks, disk) => uniqueDisks.includes(disk) ? uniqueDisks : [...uniqueDisks, disk], []);
            const missingDisks = osDisks.filter(disk => !disks.includes(disk));
            return missingDisks.length === 0;
        };

        const getUnknownMountPoints = (scheme, existingOS) => {
            const reuseRequest = getAutopartReuseDBusRequest(scheme);
            const isBootloader = (device) => bootloaderTypes.includes(devices[device].formatData.type.v);
            const existingMountPoints = Object.entries(existingOS["mount-points"].v)
                    .map(([mountPoint, device]) => isBootloader(device) ? "bootloader" : mountPoint);

            const managedMountPoints = reuseRequest["reformatted-mount-points"].v
                    .concat(reuseRequest["reused-mount-points"].v, reuseRequest["removed-mount-points"].v);

            const unknownMountPoints = existingMountPoints.filter(i => !managedMountPoints.includes(i));
            return unknownMountPoints;
        };

        const hasGPTDisk = (selectedDisks, devices) => {
            return selectedDisks.filter(device => devices[device]?.formatData.description.v === "partition table (GPT)").length > 0;
        };

        if (!hasGPTDisk(selectedDisks, devices)) {
            availability.available = false;
            availability.hidden = true;
            debug("home reuse: No disk with GPT table found.");
        }

        // Check that exactly one Linux OS is present and it is Fedora Linux
        // (Stronger check for mountpoints uniqueness is in the backend
        const linuxSystems = originalExistingSystems.filter(osdata => osdata["os-name"].v.includes("Linux"))
                .filter(osdata => isCompleteOSOnDisks(osdata, selectedDisks));
        if (linuxSystems.length === 0) {
            availability.available = false;
            availability.hidden = true;
            debug("home reuse: No existing Linux system found.");
        } else if (linuxSystems.length > 1) {
            availability.available = false;
            availability.hidden = true;
            debug("home reuse: Multiple existing Linux systems found.");
        } else {
            reusedOS = linuxSystems[0];
            if (!linuxSystems.some(osdata => osdata["os-name"].v.includes("Fedora"))) {
                availability.available = false;
                availability.hidden = true;
                debug("home reuse: No existing Fedora Linux system found.");
            }
        }

        // Check that no other than Linux system (Windows, MacOS) is found
        const allSystems = originalExistingSystems.filter(osdata => isCompleteOSOnDisks(osdata, selectedDisks));
        if (allSystems.length > linuxSystems.length) {
            availability.available = false;
            availability.hidden = true;
            debug("home reuse: Non-linux existing systems found.");
        }

        debug(`home reuse: Default scheme is ${autopartScheme}.`);
        if (reusedOS) {
            // Check that required autopartitioning scheme matches reused OS.
            // Check just "/home". To be more generic we could check all reused devices (as the backend).
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
                debug(`home reuse: No reusable existing Linux system found, reused devices must have ${requiredSchemeTypes[autopartScheme]} type`);
            }
        }

        if (reusedOS) {
            // Check that existing system does not have mountpoints unexpected
            // by the required autopartitioning scheme
            const unknownMountPoints = getUnknownMountPoints(autopartScheme, reusedOS);
            if (unknownMountPoints.length > 0) {
                availability.available = false;
                availability.hidden = true;
                console.info(`home reuse: Unknown existing mountpoints found ${unknownMountPoints}`);
            }
        }

        // TODO checks:
        // - luks - partitions are unlocked - enforce? allow opt-out?
        // - size ?

        setScenarioAvailability(availability);
    }, [defaultScheme, devices, originalExistingSystems, selectedDisks]);

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
