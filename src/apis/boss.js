/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { error } from "../helpers/log.js";
import { _callClient } from "./helpers.js";

const OBJECT_PATH = "/org/fedoraproject/Anaconda/Boss";
const INTERFACE_NAME = "org.fedoraproject.Anaconda.Boss";

const callClient = (...args) => {
    return _callClient(BossClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

/**
 * @param {string} address      Anaconda bus address
 *
 * @returns {Object}            A DBus client for the Boss bus
 */
export class BossClient {
    constructor (address) {
        if (BossClient.instance && (!address || BossClient.instance.address === address)) {
            return BossClient.instance;
        }

        BossClient.instance?.client.close();

        BossClient.instance = this;

        this.client = cockpit.dbus(
            INTERFACE_NAME,
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
    }

    init () {
        this.client.addEventListener("close", () => error("Boss client closed"));
    }
}

/**
 * @param {string} task         DBus path to a task
 *
 * @returns {Promise}           Resolves the total number of tasks
 */
export const getSteps = ({ task }) => {
    return new BossClient().client.call(
        task,
        "org.freedesktop.DBus.Properties",
        "Get",
        ["org.fedoraproject.Anaconda.Task", "Steps"]
    )
            .then(ret => ret[0]);
};

/**
 * @returns {Promise}           Resolves a list of tasks
 */
export const installWithTasks = () => {
    return callClient("InstallWithTasks", []);
};

/**
 * @param {string} locale       Locale id
 */
export const setLocale = ({ locale }) => {
    return callClient("SetLocale", [locale]);
};
