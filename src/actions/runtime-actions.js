/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getPasswordPolicies,
} from "../apis/runtime.js";

export const getPasswordPoliciesAction = () => {
    return async (dispatch) => {
        const passwordPolicies = await getPasswordPolicies();

        return dispatch({
            payload: { passwordPolicies },
            type: "GET_RUNTIME_PASSWORD_POLICIES"
        });
    };
};
