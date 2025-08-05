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

import { useAvailabilityConfiguredStorage } from "./UseConfiguredStorage.jsx";

const _ = cockpit.gettext;

/**
 * @description Uses storage configuration created through the external Cockpit storage
 * editor tool for non-default layouts. This option only appears when you have
 * configured and confirmed a valid storage layout through cockpit-storage.
 */
export const scenario = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityConfiguredStorage,
    getButtonLabel: () => _("Install"),
    getDetail: () => _("Storage is based on the configuration from 'Modify storage'."),
    getLabel: () => _("Use configured storage"),
    id: "use-configured-storage",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
