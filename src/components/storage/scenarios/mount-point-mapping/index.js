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

import { useAvailabilityMountPointMapping } from "./MountPointMapping.jsx";

const _ = cockpit.gettext;

/**
 * @description Allows you to manually assign mount points to specific devices
 * for complete control over the partition layout.
 * Use this if you have custom storage requirements or want to reuse existing
 * partitions selectively.
 */
export const scenario = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityMountPointMapping,
    getButtonLabel: () => _("Apply mount point assignment and install"),
    getDetail: () => _("Assign partitions to mount points. Useful for pre-configured custom layouts."),
    getLabel: () => _("Mount point assignment"),
    id: "mount-point-mapping",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
