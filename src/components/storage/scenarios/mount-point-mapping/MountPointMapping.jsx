/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { useContext, useEffect, useState } from "react";

import { AvailabilityState } from "../helpers.js";

import {
    StorageContext,
} from "../../../../contexts/Common.jsx";

import {
    useMountPointConstraints,
    useUsablePartitions,
} from "../../../../hooks/Storage.jsx";

const _ = cockpit.gettext;

export const useAvailabilityMountPointMapping = () => {
    const [scenarioAvailability, setScenarioAvailability] = useState();
    const mountPointConstraints = useMountPointConstraints();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const usablePartitions = useUsablePartitions();

    useEffect(() => {
        if ([usablePartitions, mountPointConstraints].some(data => data === undefined)) {
            return;
        }

        const availability = new AvailabilityState();

        availability.hidden = false;
        availability.available = !!selectedDisks.length;

        const missingNMParts = getMissingNonmountablePartitions(usablePartitions, mountPointConstraints);
        const hasFilesystems = usablePartitions
                .filter(device => device.formatData.mountable.v || device.formatData.type.v === "luks").length > 0;

        if (!hasFilesystems) {
            // No usable devices on the selected disks: hide the scenario to reduce UI clutter
            availability.hidden = true;
        } else if (missingNMParts.length) {
            availability.available = false;
            availability.reason = cockpit.format(_("Some required partitions are missing: $0"), missingNMParts.join(", "));
        }

        setScenarioAvailability(availability);
    }, [mountPointConstraints, selectedDisks, usablePartitions]);

    return scenarioAvailability;
};

const getMissingNonmountablePartitions = (usablePartitions, mountPointConstraints) => {
    const existingNonmountablePartitions = usablePartitions
            .filter(device => !device.formatData.mountable.v)
            .map(device => device.formatData.type.v);

    const missingNonmountablePartitions = mountPointConstraints.filter(constraint =>
        constraint.required.v &&
        !constraint["mount-point"].v &&
        !existingNonmountablePartitions.includes(constraint["required-filesystem-type"].v))
            .map(constraint => constraint.description);

    return missingNonmountablePartitions;
};
