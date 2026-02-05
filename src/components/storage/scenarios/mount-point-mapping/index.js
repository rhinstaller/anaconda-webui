/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
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
