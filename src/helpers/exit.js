/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { debug, error } from "./log.js";

let _isExiting = false;

export const isExiting = () => _isExiting;

export const exitGui = () => {
    _isExiting = true;

    const pidFile = cockpit.file("/run/anaconda/webui_script.pid", { superuser: "try" });
    let pid;

    pidFile.read()
            .then(content => {
                pid = content.trim();
                debug("Killing WebUI process, PID: ", pid);
                return cockpit.spawn(["kill", pid]);
            })
            .catch(exc => error("Failed to kill WebUI process, PID: ", pid, exc.message))
            .finally(pidFile.close);
};
