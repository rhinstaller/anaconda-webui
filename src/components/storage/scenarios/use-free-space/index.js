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
