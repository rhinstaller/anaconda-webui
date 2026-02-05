/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { InstallationLanguage } from "./InstallationLanguage.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Select the language & keyboard to use during installation and for the target system.";

    constructor () {
        this.component = InstallationLanguage;
        this.id = "anaconda-screen-language";
        this.label = _("Welcome");
        this.title = _("Welcome to Fedora Linux");
    }
}
