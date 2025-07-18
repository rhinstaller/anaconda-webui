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
