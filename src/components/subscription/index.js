/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { SubscriptionPage } from "./SubscriptionPage.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Register your system with Red Hat Subscription Management to access software packages and updates.";

    constructor () {
        this.component = SubscriptionPage;
        this.id = "anaconda-screen-subscription";
        this.label = _("Subscription");
        this.title = _("Subscription");
        // TODO: Add conditional logic based on subscription module availability
        this.isHidden = false;
    }
}
