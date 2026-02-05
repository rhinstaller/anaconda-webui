/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { Accounts } from "./Accounts.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Set up user accounts and administrator passwords for your system.";

    constructor () {
        this.component = Accounts;
        this.id = "anaconda-screen-accounts";
        this.label = _("Create Account");
    }
}
