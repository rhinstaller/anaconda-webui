/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getCanChangeRootPassword,
    getIsRootAccountLocked,
    getUsers,
} from "../apis/users.js";

import { parseAnacondaConfBool } from "../helpers/conf.js";
import { canModifyRootConfiguration, canModifyUserConfiguration } from "../helpers/users.js";

export const setUsersAction = (payload) => ({
    payload,
    type: "SET_USERS",
});

/**
 * Patch users slice from the Accounts UI (draft first user, root passwords, etc.).
 */
export const applyUsersPatch = (patch = {}) => (dispatch) => {
    const { firstUser, ...rest } = patch;
    const payload = { ...rest };

    if (firstUser !== undefined) {
        payload.firstUser = firstUser;
    }

    if (Object.keys(payload).length > 0) {
        dispatch(setUsersAction(payload));
    }
};

/** @param {{ automatedInstall?: boolean, conf?: object }} args  Bootstrap from `Application` / `UsersClient.init` */
export const getUsersAction = (args = {}) => async (dispatch) => {
    const { automatedInstall, conf } = args;
    const canChangeRoot = parseAnacondaConfBool(conf?.["User Interface"]?.can_change_root);
    const canChangeUsers = parseAnacondaConfBool(conf?.["User Interface"]?.can_change_users);
    const [users, isRootAccountLocked, canChangeRootPassword] = await Promise.all([
        getUsers(),
        getIsRootAccountLocked(),
        getCanChangeRootPassword()
    ]);
    const userList = users ?? [];
    const usersSpecifiedByKickstart = userList.length > 0;

    dispatch(setUsersAction({
        canChangeRootPassword: !!canChangeRootPassword,
        canModifyRootConfiguration: canModifyRootConfiguration({
            automatedInstall: !!automatedInstall,
            canChangeRoot,
            canChangeRootPassword,
        }),
        canModifyUserConfiguration: canModifyUserConfiguration({
            canChangeUsers,
            usersSpecifiedByKickstart,
        }),
        isRootEnabled: !isRootAccountLocked,
        users: userList,
        usersSpecifiedByKickstart,
    }));
};
