/*
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
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
