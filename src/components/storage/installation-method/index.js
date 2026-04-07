/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { usePartitioningReset } from "../../../hooks/Storage.jsx";

import { InstallationMethod } from "./InstallationMethod.jsx";
import { StorageInstallationReviewSummary } from "./StorageInstallationReviewSummary.jsx";
import { StorageScenarioReviewDescription } from "./StorageScenarioReviewDescription.jsx";

const _ = cockpit.gettext;

export { StorageInstallationReviewSummary, StorageScenarioReviewDescription };

export class Page {
    _description = "Choose the target device(s) for the installation and the partitioning scenario.";

    constructor () {
        this.component = InstallationMethod;
        this.id = "anaconda-screen-method";
        this.label = _("Installation method");
        /* Reset partitioning on page load to prevent stacking planned changes */
        this.usePageInit = usePartitioningReset;
    }
}
