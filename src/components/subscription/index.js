/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { SubscriptionEmbed, SubscriptionReviewDescription } from "./SubscriptionEmbed.jsx";

export { SubscriptionReviewDescription };

const _ = cockpit.gettext;

export class Page {
    _description = "Register the system with Red Hat Subscription Manager.";

    constructor ({ modules }) {
        this.component = SubscriptionEmbed;
        this.id = "anaconda-screen-subscription";
        this.isHidden = !modules.includes("org.fedoraproject.Anaconda.Modules.Subscription");
        this.label = _("Subscription");
        this.title = null;
    }
}
