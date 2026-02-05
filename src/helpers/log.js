/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

const LOG_FILE = "/tmp/anaconda-webui.log";

class Logger {
    constructor () {
        this.logger = cockpit.file(LOG_FILE);
    }

    _write_to_journal (level, args) {
        cockpit.spawn(["logger", "-t", "anaconda-webui", "-p", level, args.join(" ")]);
    }

    _write (level, args) {
        const timestamp = new Date().toISOString();
        const message = `${timestamp} [${level}] ${args.join(" ")}\n`;

        this.logger.modify(oldContent => oldContent + message);
    }

    debug (...args) {
        // see https://github.com/cockpit-project/cockpit/blob/main/HACKING.md#debug-logging-in-javascript-console
        if (window.debugging === "all" || window.debugging?.includes("anaconda")) {
            // eslint-disable-next-line no-console
            console.debug(args);
        }

        this._write("DEBUG", args);
    }

    error (...args) {
        // eslint-disable-next-line no-console
        console.error(args);
        this._write("ERROR", args);
        this._write_to_journal("err", args);
    }

    warn (...args) {
        // eslint-disable-next-line no-console
        console.warn("anaconda", ...args);
        this._write("WARN", args);
    }
}

const logger = new Logger();
export const debug = logger.debug.bind(logger);
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
