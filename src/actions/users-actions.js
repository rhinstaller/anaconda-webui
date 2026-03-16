/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getCanChangeRootPassword,
    getIsRootAccountLocked,
    getUsers,
} from "../apis/users.js";

export const setUsersAction = (users) => ({
    payload: { users },
    type: "SET_USERS"
});

export const getUsersAction = () => async (dispatch) => {
    const [users, isRootAccountLocked, canChangeRootPassword] = await Promise.all([
        getUsers(),
        getIsRootAccountLocked(),
        getCanChangeRootPassword()
    ]);
    const userList = users ?? [];
    dispatch(setUsersAction({
        canChangeRootPassword: !!canChangeRootPassword,
        isRootEnabled: !isRootAccountLocked,
        users: userList,
        usersSpecifiedByKickstart: userList.length > 0,
    }));
};
