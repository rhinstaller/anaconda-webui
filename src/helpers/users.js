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

import { objectToDbus } from "../apis/helpers.js";

import encryptUserPw from "../scripts/encrypt-user-pw.py";

const cryptUserPassword = async (password) => {
    const crypted = await python.spawn(encryptUserPw, password, { environ: ["LC_ALL=C.UTF-8"], err: "message" });
    return crypted;
};

export const applyAccounts = async (accounts) => {
    if ((accounts.users?.length ?? 0) === 0) {
        await setUsers([]);
    } else {
        const cryptedUserPw = await cryptUserPassword(accounts.password);
        const first = accounts.users?.[0] ?? {};
        const firstUserDbus = firstUserToDbus({ ...first, password: cryptedUserPw });
        const existing = accounts.users ?? [];
        const users = existing.length > 0
            ? [firstUserDbus, ...existing.slice(1).map(u => objectToDbus(u))]
            : [firstUserDbus];
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

const firstUserToDbus = (firstUser) => {
    return {
        gecos: cockpit.variant("s", firstUser.gecos ?? ""),
        groups: cockpit.variant("as", firstUser.groups ?? ["wheel"]),
        "is-crypted": cockpit.variant("b", true),
        name: cockpit.variant("s", firstUser.name ?? ""),
        password: cockpit.variant("s", firstUser.password ?? ""),
    };
};
