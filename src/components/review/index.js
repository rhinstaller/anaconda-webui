/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { ReviewConfiguration } from "./ReviewConfiguration.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Review your installation settings and start the installation process.";

    constructor () {
        this.component = ReviewConfiguration;
        this.id = "anaconda-screen-review";
        this.label = _("Review and install");
        this.title = _("Review and install");
    }
}
