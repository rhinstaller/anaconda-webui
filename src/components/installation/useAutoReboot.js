/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useEffect } from "react";

import { getRebootData } from "../../apis/runtime.js";

import { exitGui } from "../../helpers/exit.js";
import { debug } from "../../helpers/log.js";

const KS_REBOOT = 1;
const KS_SHUTDOWN = 2;

/**
 * Automatically exit the GUI after a successful automated installation
 * if the kickstart specifies a reboot or shutdown action.
 *
 * @param {string|undefined} status - current installation status
 * @param {boolean} automatedInstall - whether this is a kickstart/automated install
 */
export const useAutoReboot = (status, automatedInstall) => {
    useEffect(() => {
        if (status !== "success" || !automatedInstall) {
            return;
        }

        const autoReboot = async () => {
            const rebootData = await getRebootData();
            const action = rebootData?.action?.v;
            if (action === KS_REBOOT || action === KS_SHUTDOWN) {
                debug("Auto-exit: kickstart reboot/shutdown action detected, exiting GUI");
                exitGui();
            }
        };

        autoReboot();
    }, [status, automatedInstall]);
};
