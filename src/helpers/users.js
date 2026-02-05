/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import * as python from "python.js";

import {
    clearRootPassword,
    setCryptedRootPassword,
    setIsRootAccountLocked,
    setUsers,
} from "../apis/users.js";

import encryptUserPw from "../scripts/encrypt-user-pw.py";

const cryptUserPassword = async (password) => {
    const crypted = await python.spawn(encryptUserPw, password, { environ: ["LC_ALL=C.UTF-8"], err: "message" });
    return crypted;
};

export const applyAccounts = async (accounts) => {
    if (accounts.skipAccountCreation) {
        await setUsers([]);
    } else {
        const cryptedUserPw = await cryptUserPassword(accounts.password);
        const users = accountsToDbusUsers({ ...accounts, password: cryptedUserPw });
        await setUsers(users);
    }

    await setIsRootAccountLocked(!accounts.isRootEnabled);
    if (accounts.isRootEnabled) {
        const cryptedRootPw = await cryptUserPassword(accounts.rootPassword);
        await setCryptedRootPassword({ password: cryptedRootPw });
    } else {
        await clearRootPassword();
    }
};

const accountsToDbusUsers = (accounts) => {
    return [{
        gecos: cockpit.variant("s", accounts.fullName || ""),
        groups: cockpit.variant("as", ["wheel"]),
        "is-crypted": cockpit.variant("b", true),
        name: cockpit.variant("s", accounts.userName || ""),
        password: cockpit.variant("s", accounts.password || ""),
    }];
};
