/*
 * Copyright (C) 2022 Red Hat, Inc.
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
    getDevicesAction,
    getDiskSelectionAction,
    getPartitioningDataAction,
    setAppliedPartitioningAction,
} from "../actions/storage-actions.js";

import { debug, error } from "../helpers/log.js";
import { _callClient, _getProperty } from "./helpers.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Storage";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage";

const callClient = (...args) => {
    return _callClient(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const getProperty = (...args) => {
    return _getProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export class StorageClient {
    constructor (address, dispatch) {
        if (StorageClient.instance && (!address || StorageClient.instance.address === address)) {
            return StorageClient.instance;
        }

        StorageClient.instance?.client.close();

        StorageClient.instance = this;

        this.client = cockpit.dbus(
            INTERFACE_NAME,
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
        this.dispatch = dispatch;
    }

    async init () {
        this.client.addEventListener("close", () => error("Storage client closed"));

        this.startEventMonitor();

        await this.initData();
    }

    startEventMonitor () {
        this.client.subscribe(
            { },
            (path, iface, signal, args) => {
                switch (signal) {
                case "PropertiesChanged":
                    if (args[0] === "org.fedoraproject.Anaconda.Modules.Storage.DiskSelection") {
                        this.dispatch(getDiskSelectionAction());
                    } else if (args[0] === "org.fedoraproject.Anaconda.Modules.Storage.Partitioning.Manual" && Object.hasOwn(args[1], "Requests")) {
                        this.dispatch(getPartitioningDataAction({ partitioning: path, requests: args[1].Requests.v }));
                    } else if (args[0] === "org.fedoraproject.Anaconda.Modules.Storage.Partitioning.Automatic" && Object.hasOwn(args[1], "Request")) {
                        this.dispatch(getPartitioningDataAction({ partitioning: path, requests: [args[1].Request.v] }));
                    } else if (args[0] === INTERFACE_NAME && Object.hasOwn(args[1], "CreatedPartitioning")) {
                        const last = args[1].CreatedPartitioning.v.length - 1;
                        this.dispatch(getPartitioningDataAction({ partitioning: args[1].CreatedPartitioning.v[last] }));
                    } else if (args[0] === INTERFACE_NAME && Object.hasOwn(args[1], "AppliedPartitioning")) {
                        // First set the partitioning data and then get the device information
                        // as we store this in the store according the the deviceTree
                        this.dispatch(setAppliedPartitioningAction({ appliedPartitioning: args[1].AppliedPartitioning.v }));
                        this.dispatch(getDevicesAction());
                    } else {
                        debug(`Unhandled signal on ${path}: ${iface}.${signal} ${JSON.stringify(args)}`);
                    }
                    break;
                default:
                    debug(`Unhandled signal on ${path}: ${iface}.${signal} ${JSON.stringify(args)}`);
                }
            });
    }

    async initData () {
        const partitioning = await getProperty("CreatedPartitioning");
        if (partitioning.length !== 0) {
            const lastPartitioning = partitioning[partitioning.length - 1];
            await this.dispatch(getPartitioningDataAction({ partitioning: lastPartitioning }));
        }
        await this.dispatch(getDevicesAction());
        await this.dispatch(getDiskSelectionAction());
    }
}

/**
 * @param {string} task         DBus path to a task
 * @param {string} onSuccess    Callback to run after Succeeded signal is received
 * @param {string} onFail       Callback to run as an error handler
 *
 * @returns {Promise}           Resolves a DBus path to a task
 */
export const runStorageTask = ({ onFail, onSuccess, task }) => {
    // FIXME: This is a workaround for 'Succeeded' signal being emited twice
    let succeededEmitted = false;
    const taskProxy = new StorageClient().client.proxy(
        "org.fedoraproject.Anaconda.Task",
        task
    );
    const addEventListeners = () => {
        taskProxy.addEventListener("Stopped", async () => {
            try {
                await taskProxy.Finish();
            } catch (error) {
                onFail(error);
            }
        });
        taskProxy.addEventListener("Succeeded", () => {
            if (succeededEmitted) {
                return;
            }
            succeededEmitted = true;
            onSuccess();
        });
    };
    taskProxy.wait(() => {
        addEventListeners();
        (async () => {
            try {
                await taskProxy.Start();
            } catch (error) {
                onFail(error);
            }
        })();
    });
};

/**
 * @returns {Promise}           Resolves a DBus path to a task
 */
export const scanDevicesWithTask = () => {
    return callClient("ScanDevicesWithTask", []);
};
