/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { getIsRootAccountLocked, getUsers } from "../apis/users.js";

export const setUsersAction = (users) => ({
    payload: { users },
    type: "SET_USERS"
});

export const getUsersAction = () => async (dispatch) => {
    const [users, isRootAccountLocked] = await Promise.all([
        getUsers(),
        getIsRootAccountLocked()
    ]);
    dispatch(setUsersAction({
        isRootEnabled: !isRootAccountLocked,
        users: users ?? []
    }));
};
