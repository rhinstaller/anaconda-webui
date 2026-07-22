/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { exitInstaller, setRebootData } from "../apis/runtime.js";

import { debug, error } from "./log.js";

const KS_REBOOT = 1;

let _isExiting = false;

export const isExiting = () => _isExiting;

export const rebootSystem = () => {
    setRebootData({
        action: cockpit.variant("i", KS_REBOOT),
    }).then(exitGui);
};

const killWebUIProcess = () => {
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

export const exitGui = () => {
    _isExiting = true;

    exitInstaller()
            .catch(exc => error("Exit D-Bus call failed:", exc.message))
            .finally(killWebUIProcess);
};
