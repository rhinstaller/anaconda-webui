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
import { Checkbox, Flex } from "@patternfly/react-core";

import { AvailabilityState } from "./helpers.js";

import {
    DialogsContext,
    StorageContext,
} from "../../../contexts/Common.jsx";

import {
    useDiskFreeSpace,
    useDiskTotalSpace,
    useRequiredSize,
} from "../../../hooks/Storage.jsx";

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
        if (diskFreeSpace < requiredSize && !allowReclaim) {
            availability.available = false;
        }
        setScenarioAvailability(availability);
    }, [allowReclaim, diskFreeSpace, diskTotalSpace, requiredSize, selectedDisks]);

    return scenarioAvailability;
};

const ReclaimSpace = () => {
    const { isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked } = useContext(DialogsContext);
    const diskFreeSpace = useDiskFreeSpace();
    const requiredSize = useRequiredSize();
    const enforceAction = diskFreeSpace < requiredSize;

    useEffect(() => {
        setIsReclaimSpaceCheckboxChecked(enforceAction);
    }, [enforceAction, setIsReclaimSpaceCheckboxChecked]);

    const requiredHint = (
        <span>
            {cockpit.format(_("Required; less than $0 available"), cockpit.format_bytes(requiredSize))}
        </span>
    );
    const label = enforceAction
        ? _("Reclaim space")
        : _("Reclaim additional space");

    const labelWithHint = (
        <Flex>
            {label}
            {enforceAction && requiredHint}
        </Flex>
    );

    return (
        <Checkbox
          id="reclaim-space-checkbox"
          isChecked={isReclaimSpaceCheckboxChecked}
          isDisabled={enforceAction}
          label={labelWithHint}
          name="reclaim-space"
          onChange={(_, value) => setIsReclaimSpaceCheckboxChecked(value)}
        />
    );
};

export const scenarioUseFreeSpace = {
    action: ReclaimSpace,
    buttonVariant: "primary",
    canReclaimSpace: true,
    getAvailability: useAvailabilityUseFreeSpace,
    getButtonLabel: () => _("Install"),
    getDetail: helpUseFreeSpace,
    getLabel: () => _("Share disk with other operating system"),
    id: "use-free-space",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
