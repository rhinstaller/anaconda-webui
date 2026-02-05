/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useContext, useEffect, useState } from "react";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";

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

export const ReclaimSpace = ({ availability }) => {
    const { isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked } = useContext(DialogsContext);

    useEffect(() => {
        setIsReclaimSpaceCheckboxChecked(availability?.enforceAction);
    }, [availability?.enforceAction, setIsReclaimSpaceCheckboxChecked]);

    return (
        <Checkbox
          id="reclaim-space-checkbox"
          isChecked={isReclaimSpaceCheckboxChecked}
          isDisabled={availability?.enforceAction}
          label={!availability?.enforceAction ? _("Reclaim additional space") : _("Reclaim space (required)")}
          name="reclaim-space"
          onChange={(_, value) => setIsReclaimSpaceCheckboxChecked(value)}
        />
    );
};

const LabelUserFreeSpace = ({ isReview }) => {
    const existingSystems = usePlannedExistingSystems();

    if (isReview && existingSystems?.length) {
        return cockpit.format(_("Share disk with other operating systems: $0"), existingSystems?.map((system) => system["os-name"].v).join(", "));
    }

    return _("Share disk with other operating systems");
};

export const getLabelUseFreeSpace = (isReview) => {
    return <LabelUserFreeSpace isReview={isReview} />;
};
