/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getDefaultEnvironment,
    getEnvironmentData,
    getEnvironments,
    getGroupData,
    getPackagesKickstarted,
    getPackagesSelection,
    resolveEnvironment,
    setPackagesSelection,
} from "../apis/payload_dnf.js";

export const getPayloadEnvironmentsAction = () => {
    return async (dispatch) => {
        const environmentIds = await getEnvironments();

        const environmentResults = await Promise.all(
            environmentIds.map(async (envId) => {
                try {
                    const envData = await getEnvironmentData(envId);
                    return {
                        description: envData.description,
                        id: envId,
                        name: envData.name,
                    };
                } catch {
                    return null;
                }
            })
        );

        const environments = environmentResults.filter(Boolean);

        return dispatch({
            payload: { environments },
            type: "SET_PAYLOAD_ENVIRONMENTS",
        });
    };
};

export const getPayloadPackagesSelectionAction = () => {
    return async (dispatch) => {
        const [selection, packagesKickstarted] = await Promise.all([
            getPackagesSelection(),
            getPackagesKickstarted(),
        ]);

        return dispatch({
            payload: { packagesKickstarted, selection },
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
            type: "SET_PAYLOAD_GROUPS",
        });
    };
};

/**
 * Reload environments and re-validate the current selection after the source changes.
 */
export const refreshPayloadSoftwareSelectionAction = () => {
    return async (dispatch) => {
        await dispatch(getPayloadEnvironmentsAction());

        let selection = await getPackagesSelection();
        let environment = selection?.environment;

        if (environment) {
            const resolved = await resolveEnvironment(environment);
            if (!resolved) {
                environment = await getDefaultEnvironment();
                if (environment && await resolveEnvironment(environment)) {
                    await setPackagesSelection({ environment, groups: [] });
                } else {
                    await setPackagesSelection({ environment: "", groups: [] });
                    environment = "";
                }
                await dispatch(getPayloadPackagesSelectionAction());
                selection = await getPackagesSelection();
                environment = selection?.environment;
            }
        }

        if (environment) {
            try {
                await dispatch(getPayloadGroupsAction(environment));
            } catch {
                dispatch({
                    payload: { groups: [] },
                    type: "SET_PAYLOAD_GROUPS",
                });
            }
        } else {
            dispatch({
                payload: { groups: [] },
                type: "SET_PAYLOAD_GROUPS",
            });
        }

        await dispatch(getPayloadPackagesSelectionAction());
    };
};
