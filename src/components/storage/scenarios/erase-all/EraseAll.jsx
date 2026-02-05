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
    useDiskTotalSpace,
    useRequiredSize,
} from "../../../../hooks/Storage.jsx";

const _ = cockpit.gettext;

export const useAvailabilityEraseAll = () => {
    const [scenarioAvailability, setScenarioAvailability] = useState();

    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const diskTotalSpace = useDiskTotalSpace();
    const requiredSize = useRequiredSize();

    useEffect(() => {
        if ([diskTotalSpace, requiredSize].some((value) => value === undefined)) {
            return;
        }

        const availability = new AvailabilityState();

        availability.available = !!selectedDisks.length;
        availability.hidden = false;

        if (diskTotalSpace < requiredSize) {
            availability.available = false;
            availability.reason = _("Not enough space on selected disks.");
            availability.hint = cockpit.format(
                _("The installation needs $0 of disk space; however, the capacity of the selected disks is only $1."),
                cockpit.format_bytes(requiredSize), cockpit.format_bytes(diskTotalSpace));
        }

        return setScenarioAvailability(availability);
    }, [diskTotalSpace, requiredSize, selectedDisks]);

    return scenarioAvailability;
};
