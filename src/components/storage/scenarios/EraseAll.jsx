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

import { AvailabilityState } from "./helpers.js";

import { helpEraseAll } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

const checkEraseAll = ({ diskTotalSpace, requiredSize, selectedDisks }) => {
    const availability = new AvailabilityState();

    availability.available = !!selectedDisks.length;
    availability.hidden = false;

    if (diskTotalSpace < requiredSize) {
        availability.available = false;
        availability.reason = _("Not enough space on selected disks.");
        availability.hint = cockpit.format(
            _("The installation needs $1 of disk space; however, the capacity of the selected disks is only $0."),
            cockpit.format_bytes(diskTotalSpace), cockpit.format_bytes(requiredSize));
    }

    return availability;
};

export const scenarioEraseAll = {
    buttonLabel: _("Erase data and install"),
    buttonVariant: "danger",
    check: checkEraseAll,
    detail: helpEraseAll,
    id: "erase-all",
    // CLEAR_PARTITIONS_ALL = 1
    initializationMode: 1,
    label: _("Use entire disk"),
};
