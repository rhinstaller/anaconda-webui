/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

export const setUsersAction = (users) => ({
    payload: { users },
    type: "SET_USERS"
});
