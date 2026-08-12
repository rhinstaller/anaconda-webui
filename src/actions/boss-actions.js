/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { getInstallationStatus, getPendingErrorMessage, getPendingErrorType } from "../apis/boss.js";

export const getInstallationStatusAction = () => {
    return async (dispatch) => {
        const status = await getInstallationStatus();
        return dispatch({
            payload: { status },
            type: "GET_INSTALLATION_STATUS",
        });
    };
};
export const getPendingErrorAction = () => {
    return async (dispatch) => {
        const [message, type] = await Promise.all([getPendingErrorMessage(), getPendingErrorType()]);
        return dispatch({
            payload: { message, type },
            type: "GET_PENDING_ERROR",
        });
    };
};
