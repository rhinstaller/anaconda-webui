/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { useAvailabilityHomeReuse } from "./ReinstallFedora.jsx";

const _ = cockpit.gettext;

/**
 * @description Reinstalls Fedora while preserving your existing home directory and user data.
 * Use when you want to refresh your Fedora installation while keeping all your personal files
 * and settings. This option only appears when exactly one existing Fedora system is detected
 * and the system has only the default mount points.
 */
export const scenario = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityHomeReuse,
    getButtonLabel: () => _("Reinstall Fedora"),
    getDetail: () => _("Replace current installation, but keep files in home."),
    getLabel: () => _("Reinstall Fedora"),
    id: "home-reuse",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
