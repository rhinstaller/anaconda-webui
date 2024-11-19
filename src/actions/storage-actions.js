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

import cockpit from "cockpit";

import {
    getActions,
    getDeviceData,
    getDevices,
    getDiskFreeSpace,
    getDiskTotalSpace,
    getExistingSystems,
    getFormatData,
    getMountPoints,
} from "../apis/storage_devicetree.js";
import {
    getAllDiskSelection,
    getUsableDisks,
} from "../apis/storage_disks_selection.js";
import {
    gatherRequests,
    getAutomaticPartitioningRequest,
    getDeviceTree,
    getPartitioningMethod,
} from "../apis/storage_partitioning.js";

export const getDevicesAction = () => {
    return async (dispatch) => {
        dispatch({
            payload: { isFetching: true },
            type: "SET_IS_FETCHING",
        });

        const actions = await getActions();
        const devices = await getDevices();
        const deviceData = {};
        const mountPoints = await getMountPoints();
        const existingSystems = await getExistingSystems();
        for (const device of devices) {
            try {
                const devData = await getDeviceData({ disk: device });

                const free = await getDiskFreeSpace({ diskNames: [device] });
                // extend it with variants to keep the format consistent
                devData.free = cockpit.variant(String, free);

                const total = await getDiskTotalSpace({ diskNames: [device] });
                devData.total = cockpit.variant(String, total);

                const formatData = await getFormatData({ diskName: device });
                devData.formatData = formatData;

                deviceData[device] = devData;
            } catch (error) {
                if (error.name === "org.fedoraproject.Anaconda.Modules.Storage.UnknownDeviceError") {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        dispatch({
            payload: { isFetching: false },
            type: "SET_IS_FETCHING",
        });

        return dispatch({
            payload: {
                actions,
                devices: deviceData,
                existingSystems,
                mountPoints,
            },
            type: "GET_DEVICES_DATA"
        });
    };
};

export const getDiskSelectionAction = () => {
    return async (dispatch) => {
        const usableDisks = await getUsableDisks();
        const diskSelection = await getAllDiskSelection();

        return dispatch({
            payload: {
                diskSelection: {
                    ignoredDisks: diskSelection[0].IgnoredDisks.v,
                    selectedDisks: diskSelection[0].SelectedDisks.v,
                    usableDisks,
                }
            },
            type: "GET_DISK_SELECTION",
        });
    };
};

export const getPartitioningDataAction = ({ partitioning, requests }) => {
    return async (dispatch) => {
        const props = { path: partitioning };
        const convertRequests = reqs => reqs.map(request => Object.entries(request).reduce((acc, [key, value]) => ({ ...acc, [key]: value.v }), {}));
        const deviceTreePath = await getDeviceTree({ partitioning });

        if (!requests) {
            props.method = await getPartitioningMethod({ partitioning });
            if (props.method === "MANUAL") {
                const reqs = await gatherRequests({ partitioning });

                props.requests = convertRequests(reqs);
            } else {
                const reqs = await getAutomaticPartitioningRequest({ partitioning });

                props.requests = convertRequests([reqs]);
            }
        } else {
            props.requests = convertRequests(requests);
        }

        return dispatch({
            payload: { deviceTree: { path: deviceTreePath }, partitioningData: props, path: partitioning },
            type: "GET_PARTITIONING_DATA"
        });
    };
};

export const setAppliedPartitioningAction = ({ appliedPartitioning }) => {
    return {
        payload: { appliedPartitioning },
        type: "SET_APPLIED_PARTITIONING",
    };
};

export const setStorageScenarioAction = (scenario) => {
    window.sessionStorage.setItem("storage-scenario-id", scenario);

    return {
        payload: { scenario },
        type: "SET_STORAGE_SCENARIO",
    };
};

export const setLuksEncryptionDataAction = (payload) => {
    return {
        payload,
        type: "SET_LUKS_ENCRYPTION_DATA",
    };
};
