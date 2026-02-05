/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { error } from "../helpers/log.js";
import { _callClient, _setProperty } from "./helpers.js";

const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Users";
const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Users";

const setProperty = (...args) => {
    return _setProperty(UsersClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

const callClient = (...args) => {
    return _callClient(UsersClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export class UsersClient {
    constructor (address, dispatch) {
        if (UsersClient.instance && (!address || UsersClient.instance.address === address)) {
            return UsersClient.instance;
        }

        UsersClient.instance?.client.close();

        UsersClient.instance = this;

        this.client = cockpit.dbus(
            INTERFACE_NAME,
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
        this.dispatch = dispatch;
    }

    init () {
        this.client.addEventListener(
            "close", () => error("Users client closed")
        );
    }
}

/**
 * @param {Array.<Object>} users An array of user objects
 */
export const setUsers = (users) => {
    return setProperty("Users", cockpit.variant("aa{sv}", users));
};

/**
 * @param {boolean} locked     True if locked, otherwise False
 */
export const setIsRootAccountLocked = (locked) => {
    return setProperty("IsRootAccountLocked", cockpit.variant("b", locked));
};

/**
 * @param {string} password   Crypted root password
 */
export const setCryptedRootPassword = ({ password }) => {
    return callClient("SetCryptedRootPassword", [password]);
};

export const clearRootPassword = () => {
    return callClient("ClearRootPassword", []);
};

export const guessUsernameFromFullName = (fullName) => {
    return callClient("GuessUsernameFromFullName", [fullName]);
};
