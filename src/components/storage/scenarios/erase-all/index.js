/*
 * Copyright (C) 2025 Red Hat, Inc.
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

import { useAvailabilityEraseAll } from "./EraseAll.jsx";

const _ = cockpit.gettext;

/**
 * @description Completely erases all data on the selected disks and
 * automatically creates a new partition layout.
 * Use this for clean installations when you do not need to preserve any existing data.
 */
export const scenario = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityEraseAll,
    getButtonLabel: () => _("Erase data and install"),
    getDetail: () => _("Remove all partitions on the selected devices, including existing operating systems."),
    getLabel: () => _("Use entire disk"),
    id: "erase-all",
    // CLEAR_PARTITIONS_ALL = 1
    initializationMode: 1,
};
