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
