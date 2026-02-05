/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
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
