/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { getPasswordPoliciesAction } from "../actions/runtime-actions.js";

import { debug, error } from "../helpers/log.js";
import { _getProperty } from "./helpers.js";

const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Runtime/UserInterface";
const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Runtime.UserInterface";

const getProperty = (...args) => {
    return _getProperty(RuntimeClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export class RuntimeClient {
    constructor (address, dispatch) {
        if (RuntimeClient.instance && (!address || RuntimeClient.instance.address === address)) {
            return RuntimeClient.instance;
        }

        RuntimeClient.instance?.client.close();

        RuntimeClient.instance = this;

        this.client = cockpit.dbus(
            "org.fedoraproject.Anaconda.Modules.Runtime",
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
        this.dispatch = dispatch;
    }

    async init () {
        this.client.addEventListener(
            "close", () => error("Runtime client closed")
        );

        this.startEventMonitor();

        await this.initData();
    }

    startEventMonitor () {
        this.client.subscribe(
            { },
            (path, iface, signal, args) => {
                switch (signal) {
                case "PropertiesChanged":
                    if (args[0] === INTERFACE_NAME && Object.hasOwn(args[1], "PasswordPolicies")) {
                        this.dispatch(getPasswordPoliciesAction());
                    } else {
                        debug(`Unhandled signal on ${path}: ${iface}.${signal}`, JSON.stringify(args));
                    }
                    break;
                default:
                    debug(`Unhandled signal on ${path}: ${iface}.${signal}`, JSON.stringify(args));
                }
            }
        );
    }

    async initData () {
        await this.dispatch(getPasswordPoliciesAction());
    }
}

/**
 * @returns {Promise}           Returns the full product data
 */
const getProductData = () => {
    return getProperty("ProductData");
};

/**
 * @returns {Promise}           Reports if the given OS release is considered final
 */
export const getIsFinal = async () => {
    let res;
    try {
        const productData = await getProductData();
        res = productData["is-final-release"].v;
    } catch (ex) {
        if (ex.name === "org.freedesktop.DBus.Error.InvalidArgs") {
            res = await getProperty("IsFinal");
        }
    }
    return res;
};

/**
 *
 * @returns {Promise}           Returns the password policies
 */
export const getPasswordPolicies = () => {
    return getProperty("PasswordPolicies");
};
