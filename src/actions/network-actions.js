/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getConnected, getHostname,
} from "../apis/network.js";

export const getConnectedAction = () => {
    return async (dispatch) => {
        const connected = await getConnected();

        return dispatch({
            payload: { connected },
            type: "GET_NETWORK_CONNECTED"
        });
    };
};

export const getHostnameAction = () => {
    return async (dispatch) => {
        const hostname = await getHostname();

        return dispatch({
            payload: { hostname },
            type: "GET_NETWORK_HOSTNAME"
        });
    };
};
