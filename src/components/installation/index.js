/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { InstallationProgress } from "./InstallationProgress.jsx";

export class Page {
    _description = "Monitor the installation progress and completion.";

    constructor () {
        this.component = InstallationProgress;
        this.id = "anaconda-screen-progress";
        this.isFinal = true;
    }
}
