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

export const setUserConfigurationPolicyAction = (policy) => ({
    payload: policy,
    type: "SET_USER_CONFIGURATION_POLICY",
});

export const getUserConfigurationPolicyAction = (args = {}) => async (dispatch) => {
    const { automatedInstall, conf } = args;
    const canChangeRoot = parseAnacondaConfBool(conf?.["User Interface"]?.can_change_root);
    const canChangeUsers = parseAnacondaConfBool(conf?.["User Interface"]?.can_change_users);

    const [users, canChangeRootPassword] = await Promise.all([
        getUsers(),
        getCanChangeRootPassword(),
    ]);
    const userList = users ?? [];
    const usersSpecifiedByKickstart = userList.length > 0;

    dispatch(setUserConfigurationPolicyAction({
        canModifyRootConfiguration: canModifyRootConfiguration({
            automatedInstall: !!automatedInstall,
            canChangeRoot,
            canChangeRootPassword: !!canChangeRootPassword,
        }),
        canModifyUserConfiguration: canModifyUserConfiguration({
            canChangeUsers,
            usersSpecifiedByKickstart,
        }),
        usersSpecifiedByKickstart,
    }));
};

export const getUsersAction = () => async (dispatch) => {
    const [users, isRootAccountLocked] = await Promise.all([
        getUsers(),
        getIsRootAccountLocked(),
    ]);
    const userList = users ?? [];

    dispatch(setUsersAction({
        isRootEnabled: !isRootAccountLocked,
        users: userList,
    }));
};
