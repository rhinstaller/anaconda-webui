/*
 * Copyright (C) 2025 Red Hat, Inc.
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
    getEnvironmentData,
    getEnvironments,
    getPackagesSelection,
} from "../apis/payload_dnf.js";

export const getPayloadEnvironmentsAction = () => {
    return async (dispatch) => {
        const environmentIds = await getEnvironments();

        // Fetch environment data for each environment to get descriptions
        const environmentDataPromises = environmentIds.map(async (envId) => {
            const envData = await getEnvironmentData(envId);
            return {
                description: envData.description,
                id: envId,
                name: envData.name,
            };
        });

        const environments = await Promise.all(environmentDataPromises);

        return dispatch({
            payload: { environments },
            type: "SET_PAYLOAD_ENVIRONMENTS"
        });
    };
};

export const getPayloadPackagesSelectionAction = () => {
    return async (dispatch) => {
        const selection = await getPackagesSelection();

        return dispatch({
            payload: { selection },
            type: "SET_PAYLOAD_SELECTION"
        });
    };
};
