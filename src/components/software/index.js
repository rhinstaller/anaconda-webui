/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { SoftwareSelection } from "./SoftwareSelection.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Select packages to install by choosing a base environment.";

    constructor ({ payloadType }) {
        this.component = SoftwareSelection;
        this.id = "anaconda-screen-software-selection";
        this.isHidden = payloadType !== "DNF";
        this.label = _("Software selection");
        this.title = _("Software selection");
    }
}
