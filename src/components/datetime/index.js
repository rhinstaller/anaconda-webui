/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { DateAndTimePage } from "./DateAndTime.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Configure your system's timezone, date, and time settings. You can also set up network time synchronization.";

    constructor () {
        this.component = DateAndTimePage;
        this.id = "anaconda-screen-date-time";
        this.label = _("Date and time");
    }
}
