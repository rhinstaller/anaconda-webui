/*
 * Copyright (C) 2023 Red Hat, Inc.
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

const LOG_FILE = "/tmp/anaconda-webui.log";

class Logger {
    constructor () {
        this.logger = cockpit.file(LOG_FILE);
    }

    _write (level, args) {
        const timestamp = new Date().toISOString();
        const message = `${timestamp} [${level}] ${args.join(" ")}\n`;

        this.logger.modify(oldContent => oldContent + message);
    }

    debug (...args) {
        // see https://github.com/cockpit-project/cockpit/blob/main/HACKING.md#debug-logging-in-javascript-console
        if (window.debugging === "all" || window.debugging?.includes("anaconda")) {
            console.debug("anaconda", ...args);
        }

        this._write("DEBUG", args);
    }

    error (...args) {
        console.error("anaconda", ...args);
        this._write("ERROR", args);
    }
}

const logger = new Logger();
export const debug = logger.debug.bind(logger);
export const error = logger.error.bind(logger);
