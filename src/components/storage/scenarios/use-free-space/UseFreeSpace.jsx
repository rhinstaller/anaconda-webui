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

import React, { useContext, useEffect, useState } from "react";
import { Checkbox } from "@patternfly/react-core";

import { AvailabilityState } from "../helpers.js";

import {
    DialogsContext,
    StorageContext,
} from "../../../../contexts/Common.jsx";

import {
    useDiskFreeSpace,
    useDiskTotalSpace,
    usePlannedExistingSystems,
    useRequiredSize,
} from "../../../../hooks/Storage.jsx";

import { helpUseFreeSpace } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

export const useAvailabilityUseFreeSpace = (args) => {
    const allowReclaim = args?.allowReclaim ?? true;
    const [scenarioAvailability, setScenarioAvailability] = useState();

    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const diskFreeSpace = useDiskFreeSpace();
    const diskTotalSpace = useDiskTotalSpace();
    const requiredSize = useRequiredSize();

    useEffect(() => {
        if ([diskFreeSpace, diskTotalSpace, requiredSize].some((value) => value === undefined)) {
            return;
        }

        const availability = new AvailabilityState();

        availability.hidden = false;
        availability.available = !!selectedDisks.length;

        if (diskFreeSpace > 0 && diskTotalSpace > 0) {
            availability.hidden = diskFreeSpace === diskTotalSpace;
        }
        if (diskFreeSpace < requiredSize) {
            availability.reason = _("Not enough free space on the selected disks.");
            availability.hint = cockpit.format(
                _("To use this option, resize or remove existing partitions to free up at least $0."),
                cockpit.format_bytes(requiredSize)
            );
            if (allowReclaim) {
                availability.enforceAction = true;
            } else {
                availability.available = false;
            }
        }
        setScenarioAvailability(availability);
    }, [allowReclaim, diskFreeSpace, diskTotalSpace, requiredSize, selectedDisks]);

    return scenarioAvailability;
};

const ReclaimSpace = ({ availability }) => {
    const { isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked } = useContext(DialogsContext);

    useEffect(() => {
        setIsReclaimSpaceCheckboxChecked(availability.enforceAction);
    }, [availability.enforceAction, setIsReclaimSpaceCheckboxChecked]);

    return (
        <Checkbox
          id="reclaim-space-checkbox"
          isChecked={isReclaimSpaceCheckboxChecked}
          isDisabled={availability.enforceAction}
          label={!availability.enforceAction ? _("Reclaim additional space") : _("Reclaim space (required)")}
          name="reclaim-space"
          onChange={(_, value) => setIsReclaimSpaceCheckboxChecked(value)}
        />
    );
};

const ScenarioLabel = ({ isReview }) => {
    const existingSystems = usePlannedExistingSystems();

    if (isReview && existingSystems?.length) {
        return cockpit.format(_("Share disk with other operating systems: $0"), existingSystems?.map((system) => system["os-name"].v).join(", "));
    }

    return _("Share disk with other operating systems");
};

/**
 * @description Installs using only unallocated free space, preserving existing partitions
 * and data. Use when you want to dual-boot with existing operating systems. This option only
 * appears when existing partitions are detected on the selected disks.
 */
export const scenarioUseFreeSpace = {
    action: ReclaimSpace,
    buttonVariant: "primary",
    canReclaimSpace: true,
    getAvailability: useAvailabilityUseFreeSpace,
    getButtonLabel: () => _("Install"),
    getDetail: helpUseFreeSpace,
    getLabel: (params) => <ScenarioLabel isReview={params?.isReview} />,
    id: "use-free-space",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
