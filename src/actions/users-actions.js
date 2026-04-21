/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getCanChangeRootPassword,
    getIsRootAccountLocked,
    getUsers,
} from "../apis/users.js";

import { canModifyRootConfiguration, canModifyUserConfiguration } from "../helpers/users.js";
import { parseAnacondaConfBool } from "../helpers/utils.js";

export const setUsersAction = (payload) => ({
    payload,
    type: "SET_USERS",
});

export const setFirstUserAction = ({ confirmPassword, gecos, name, password }) => ({
    payload: { confirmPassword, gecos, name, password },
    type: "SET_FIRST_USER",
});

export const clearUsersAction = () => ({
    type: "CLEAR_USERS",
});

export const setRootAccountAction = ({ isRootEnabled, rootConfirmPassword, rootPassword }) => ({
    payload: { isRootEnabled, rootConfirmPassword, rootPassword },
    type: "SET_ROOT_ACCOUNT",
});

export const setUserConfigurationPolicyAction = (payload) => ({
    payload,
    type: "SET_USER_CONFIGURATION_POLICY",
});

export const getUserConfigurationAction = ({ automatedInstall, conf }) => async (dispatch) => {
    const [userList, canChangeRootPassword] = await Promise.all([
        getUsers(),
        getCanChangeRootPassword(),
    ]);
    const usersSpecifiedByKickstart = (userList ?? []).length > 0;
    const canChangeRootPasswordBool = !!canChangeRootPassword;

    const canChangeRoot = parseAnacondaConfBool(conf?.["User Interface"]?.can_change_root);
    const canChangeUsers = parseAnacondaConfBool(conf?.["User Interface"]?.can_change_users);
    dispatch(setUserConfigurationPolicyAction({
        canModifyRootConfiguration: canModifyRootConfiguration({
            automatedInstall,
            canChangeRoot,
            canChangeRootPassword: canChangeRootPasswordBool,
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
