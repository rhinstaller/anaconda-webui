/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import {
    getActions,
    getAncestors,
    getDeviceData,
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
        const mountPoints = await getMountPoints();
        const existingSystems = await getExistingSystems();

        // Start from stable physical disks (GetUsableDisks) rather than GetDevices
        // which returns all devices including transient LUKS containers created during
        // encryption setup. Walking the tree top-down via children.v avoids the race
        // where GetDevices snapshots an ID that vanishes before GetDeviceData is called.
        const rootDiskIds = await getUsableDisks();
        const ancestorIds = await getAncestors({ diskIds: rootDiskIds });
        const deviceData = {};
        const toVisit = [...new Set([...rootDiskIds, ...ancestorIds])];
        const visited = new Set();

        while (toVisit.length > 0) {
            const device = toVisit.pop();
            if (visited.has(device)) continue;
            visited.add(device);

            try {
                const devData = await getDeviceData({ disk: device });

                // Empty DeviceData (device-id="") means the device vanished between
                // enumeration and fetch — skip it and do not recurse into its children.
                if (!devData["device-id"]?.v) continue;

                if (devData["is-disk"].v) {
                    const free = await getDiskFreeSpace({ diskNames: [device] });
                    // extend it with variants to keep the format consistent
                    devData.free = cockpit.variant(String, free);

                    const total = await getDiskTotalSpace({ diskNames: [device] });
                    devData.total = cockpit.variant(String, total);
                } else {
                    devData.free = cockpit.variant(String, 0);
                    devData.total = cockpit.variant(String, devData.size.v);
                }

                const formatData = await getFormatData({ diskName: device });
                devData.formatData = formatData;

                deviceData[device] = devData;

                for (const childId of (devData.children?.v ?? [])) {
                    if (!visited.has(childId)) toVisit.push(childId);
                }
            } catch (error) {
                if (error.name === "org.fedoraproject.Anaconda.Modules.Storage.UnknownDeviceError") {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        dispatch({
            payload: {
                actions,
                devices: deviceData,
                existingSystems,
                mountPoints,
            },
            type: "GET_DEVICES_DATA"
        });

        dispatch({
            payload: { isFetching: false },
            type: "SET_IS_FETCHING",
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
            } else if (props.method === "AUTOMATIC") {
                const reqs = await getAutomaticPartitioningRequest({ partitioning });

                props.requests = convertRequests([reqs]);
            } else {
                props.requests = [];
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
