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

import { useCallback, useReducer } from "react";

/* Initial state for the storeage store substate */
export const storageInitialState = {
    appliedPartitioning: null,
    deviceTrees: {
        "": {
            actions: [],
            devices: {},
            mountPoints: {},
        },
    },
    diskSelection: {
        ignoredDisks: [],
        selectedDisks: [],
        usableDisks: []
    },
    luks: {
        confirmPassphrase: "",
        encrypted: false,
        passphrase: "",
    },
    mountPoints: {},
    partitioning: {},
    storageScenarioId: null,
};

/* Initial state for the localization store substate */
export const localizationInitialState = {
    commonLocales: [],
    language: "",
    languages: {}
};

/* Intial state for the network store substate */
export const networkInitialState = {
    connected: null
};

/* Intial state for the runtime store substate */
export const runtimeInitialState = {
    connected: null
};

export const miscInitialState = {
    isFetching: false,
};

/* Initial state for the users store substate */
/* FIXME: This is not storing information from the anaconda backend, but also non-submitted user input */
/* The Store is meant to store information from the backend only */
export const usersInitialState = {
    confirmPassword: "",
    fullName: "",
    isRootEnabled: false,
    password: "",
    rootConfirmPassword: "",
    rootPassword: "",
    userName: "",
};

/* Initial state for the global store */
export const initialState = {
    localization: localizationInitialState,
    misc: miscInitialState,
    network: networkInitialState,
    runtime: runtimeInitialState,
    storage: storageInitialState,
    users: usersInitialState,
};

/* Custom hook to use the reducer with async actions */
export const useReducerWithThunk = (reducer, initialState) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    function customDispatch (action) {
        if (typeof action === "function") {
            return action(customDispatch);
        } else {
            dispatch(action);
        }
    }

    // Memoize so you can include it in the dependency array without causing infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stableDispatch = useCallback(customDispatch, [dispatch]);

    return [state, stableDispatch];
};

export const reducer = (state, action) => {
    return ({
        localization: localizationReducer(state.localization, action),
        misc: miscReducer(state.misc, action),
        network: networkReducer(state.network, action),
        runtime: runtimeReducer(state.runtime, action),
        storage: storageReducer(state.storage, action),
        users: usersReducer(state.users, action)
    });
};

export const storageReducer = (state = storageInitialState, action) => {
    if (action.type === "GET_DEVICES_DATA") {
        return {
            ...state,
            deviceTrees: {
                ...state.deviceTrees,
                [state.appliedPartitioning ? state.partitioning.deviceTree.path : ""]: {
                    actions: action.payload.actions,
                    devices: action.payload.devices,
                    existingSystems: action.payload.existingSystems,
                    mountPoints: action.payload.mountPoints,
                }
            }
        };
    } else if (action.type === "GET_DISK_SELECTION") {
        return { ...state, diskSelection: action.payload.diskSelection };
    } else if (action.type === "GET_PARTITIONING_DATA") {
        return {
            ...state,
            partitioning: {
                ...state.partitioning,
                ...action.payload.partitioningData,
                deviceTree: action.payload.deviceTree,
                storageScenarioId: state.storageScenarioId
            }
        };
    } else if (action.type === "SET_APPLIED_PARTITIONING") {
        return { ...state, appliedPartitioning: action.payload.appliedPartitioning };
    } else if (action.type === "SET_STORAGE_SCENARIO") {
        return { ...state, storageScenarioId: action.payload.scenario };
    } else if (action.type === "SET_LUKS_ENCRYPTION_DATA") {
        const newLuksState = {
            ...state.luks,
            ...action.payload,
        };

        if (action.payload.encrypted === false) {
            newLuksState.passphrase = "";
            newLuksState.confirmPassphrase = "";
        }

        return {
            ...state,
            luks: newLuksState,
        };
    } else {
        return state;
    }
};

export const localizationReducer = (state = localizationInitialState, action) => {
    if (action.type === "GET_LANGUAGE_DATA") {
        return { ...state, languages: { ...state.languages, ...action.payload.languageData } };
    } else if (action.type === "GET_COMMON_LOCALES") {
        return { ...state, commonLocales: action.payload.commonLocales };
    } else if (action.type === "GET_LANGUAGE") {
        return { ...state, language: action.payload.language };
    } else {
        return state;
    }
};

export const networkReducer = (state = networkInitialState, action) => {
    if (action.type === "GET_NETWORK_CONNECTED") {
        return { ...state, connected: action.payload.connected };
    } else if (action.type === "GET_NETWORK_HOSTNAME") {
        return { ...state, hostname: action.payload.hostname };
    } else {
        return state;
    }
};

const miscReducer = (state = miscInitialState, action) => {
    if (action.type === "SET_IS_FETCHING") {
        return { ...state, isFetching: action.payload.isFetching };
    } else {
        return state;
    }
};

export const runtimeReducer = (state = runtimeInitialState, action) => {
    if (action.type === "GET_RUNTIME_PASSWORD_POLICIES") {
        return { ...state, passwordPolicies: action.payload.passwordPolicies };
    } else {
        return state;
    }
};

export const usersReducer = (state = usersInitialState, action) => {
    if (action.type === "SET_USERS") {
        return { ...state, ...action.payload.users };
    } else {
        return state;
    }
};
