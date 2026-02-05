/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { usePartitioningReset } from "../../../hooks/Storage.jsx";

import { StorageConfiguration } from "./StorageConfiguration.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Automatic partitioning configuration, disk encryption, and storage options.";

    constructor ({ storageScenarioId }) {
        this.component = StorageConfiguration;
        this.id = "anaconda-screen-storage-configuration";
        this.label = _("Storage configuration");
        this.title = _("Storage configuration");
        this.isHiddenForScenarios = ["mount-point-mapping", "use-configured-storage", "home-reuse"];
        this.isHidden = this.isHiddenForScenarios.includes(storageScenarioId);
        /* Reset partitioning on page load to prevent stacking planned changes */
        this.usePageInit = usePartitioningReset;
    }
}
