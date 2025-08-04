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

import { usePartitioningReset } from "../../../hooks/Storage.jsx";

import { StorageConfiguration } from "./StorageConfiguration.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Automatic partitioning configuration, disk encryption, and storage options.";

    constructor (isBootIso, storageScenarioId) {
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
