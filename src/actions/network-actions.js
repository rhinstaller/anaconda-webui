/*
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */

import {
    getConnected, getHostname,
} from "../apis/network.js";

import { setCriticalErrorAction } from "./miscellaneous-actions.js";

export const getConnectedAction = () => {
    return async (dispatch) => {
        try {
            const connected = await getConnected();

            return dispatch({
                payload: { connected },
                type: "GET_NETWORK_CONNECTED"
            });
        } catch (error) {
            setCriticalErrorAction(error);
        }
    };
};

export const getHostnameAction = () => {
    return async (dispatch) => {
        try {
            const hostname = await getHostname();

            return dispatch({
                payload: { hostname },
                type: "GET_NETWORK_HOSTNAME"
            });
        } catch (error) {
            setCriticalErrorAction(error);
        }
    };
};
