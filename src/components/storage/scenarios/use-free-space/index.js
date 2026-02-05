/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import {
    getLabelUseFreeSpace,
    ReclaimSpace,
    useAvailabilityUseFreeSpace,
} from "./UseFreeSpace.jsx";

const _ = cockpit.gettext;

/**
 * @description Installs using only unallocated free space, preserving existing partitions
 * and data. Use when you want to dual-boot with existing operating systems. This option only
 * appears when existing partitions are detected on the selected disks.
 */
export const scenario = {
    action: ReclaimSpace,
    buttonVariant: "primary",
    canReclaimSpace: true,
    docsLabel: "Use free space",
    getAvailability: useAvailabilityUseFreeSpace,
    getButtonLabel: () => _("Install"),
    getDetail: () => _("Keep current disk layout and use available space, to dual-boot with another OS."),
    getLabel: params => getLabelUseFreeSpace(params?.isReview),
    id: "use-free-space",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
