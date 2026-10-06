/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { NetworkConfiguration } from "./NetworkConfiguration.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Configure network connections for the system.";

    constructor ({ isBootIso }) {
        this.component = NetworkConfiguration;
        this.id = "anaconda-screen-network";
        this.isHidden = !isBootIso;
        this.label = _("Network");
        this.title = _("Network Configuration");
    }
}
