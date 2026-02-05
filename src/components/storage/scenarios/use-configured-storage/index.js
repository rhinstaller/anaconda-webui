/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
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
