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
    getGroupData,
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

export const getPayloadGroupsAction = (environment) => {
    return async (dispatch) => {
        const envData = await getEnvironmentData(environment);

        // Get available groups from environment data
        const optionalGroups = envData["optional-groups"];
        const visibleGroups = envData["visible-groups"];
        const defaultGroups = envData["default-groups"];

        // Combine all groups, removing duplicates
        const allGroups = [...new Set([...optionalGroups, ...visibleGroups])];

        // Fetch group data for each group
        const groupDataPromises = allGroups.map(async (groupId) => {
            const groupData = await getGroupData(groupId);
            return {
                description: groupData.description,
                id: groupId,
                isDefault: defaultGroups.includes(groupId),
                isOptional: optionalGroups.includes(groupId),
                name: groupData.name,
            };
        });

        const groups = await Promise.all(groupDataPromises);

        return dispatch({
            payload: { groups },
            type: "SET_PAYLOAD_GROUPS"
        });
    };
};
