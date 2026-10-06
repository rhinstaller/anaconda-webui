/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { useAvailabilityConfiguredStorage } from "./UseConfiguredStorage.jsx";

const _ = cockpit.gettext;

/** Scenario IDs that mean "use existing configured storage" (cockpit or kickstart). */
export const USE_CONFIGURED_STORAGE_SCENARIO_IDS = ["use-configured-storage", "use-configured-storage-kickstart"];

export { useAvailabilityConfiguredStorage };

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

/**
 * @description Uses storage layout defined by the kickstart file
 */
export const scenarioKickstart = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityConfiguredStorage,
    getButtonLabel: () => _("Install"),
    getDetail: () => _("Storage layout is defined by the kickstart file. The planned partitioning layout can be reviewed in the summary step."),
    getLabel: () => _("Use configured storage"),
    id: "use-configured-storage-kickstart",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
};
