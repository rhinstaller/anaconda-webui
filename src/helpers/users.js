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

/**
 * Whether the installer UI may change root password / lock state.
 *
 * Ported from Anaconda's shared UI helper (same control flow as
 * `can_modify_root_configuration` in pyanaconda):
 * https://github.com/rhinstaller/anaconda/blob/main/pyanaconda/ui/lib/users.py
 *
 * @param {object} opts
 * @param {boolean} opts.automatedInstall  Same role as Anaconda `flags.automatedInstall`
 * @param {boolean} opts.canChangeRoot     Same role as Anaconda `conf.ui.can_change_root`
 * @param {boolean} opts.canChangeRootPassword  Users module `CanChangeRootPassword`
 * @returns {boolean}
 */
export const canModifyRootConfiguration = ({
    automatedInstall,
    canChangeRoot,
    canChangeRootPassword,
}) => {
    // Allow changes in the interactive mode.
    if (!automatedInstall) {
        return true;
    }

    // Does the configuration allow changes?
    if (canChangeRoot) {
        return true;
    }

    // Allow changes if the root account isn't
    // already configured by the kickstart file.
    if (canChangeRootPassword) {
        return true;
    }

    return false;
};

/**
 * Whether the Accounts user-creation section may be edited when the Users module
 * already lists accounts (e.g. kickstart / interactive defaults).
 * Aligns with Anaconda’s use of `conf.ui.can_change_users` for the user spoke.
 *
 * @param {object} opts
 * @param {boolean} opts.canChangeUsers Same role as Anaconda `conf.ui.can_change_users`
 * @param {boolean} opts.usersSpecifiedByKickstart Installer already has user entries to show
 * @returns {boolean}
 */
export const canModifyUserConfiguration = ({ canChangeUsers, usersSpecifiedByKickstart }) => {
    return !usersSpecifiedByKickstart || canChangeUsers;
};

const cryptUserPassword = async (password) => {
    const crypted = await python.spawn(encryptUserPw, password, { environ: ["LC_ALL=C.UTF-8"], err: "message" });
    return crypted;
};

export const applyAccounts = async (accounts) => {
    if ((accounts.users?.length ?? 0) === 0) {
        await setUsers([]);
    } else if (!accounts.usersSpecifiedByKickstart || accounts.canModifyUserConfiguration) {
        const cryptedUserPw = await cryptUserPassword(accounts.password);
        const first = accounts.users?.[0] ?? {};
        const firstUserDbus = firstUserToDbus({ ...first, password: cryptedUserPw });
        const existing = accounts.users ?? [];
        const users = existing.length > 0
            ? [firstUserDbus, ...existing.slice(1).map(u => objectToDbus(u))]
            : [firstUserDbus];
        await setUsers(users);
    }

    if (accounts.canModifyRootConfiguration) {
        await setIsRootAccountLocked(!accounts.isRootEnabled);
        if (accounts.isRootEnabled) {
            const cryptedRootPw = await cryptUserPassword(accounts.rootPassword);
            await setCryptedRootPassword({ password: cryptedRootPw });
        } else {
            await clearRootPassword();
        }
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
