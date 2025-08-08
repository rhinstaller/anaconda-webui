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
import { _callClient } from "./helpers.js";

import {
    runStorageTask,
    StorageClient,
} from "./storage.js";

const INTERFACE_NAME_VIEWER = "org.fedoraproject.Anaconda.Modules.Storage.DeviceTree.Viewer";
const INTERFACE_NAME_HANDLER = "org.fedoraproject.Anaconda.Modules.Storage.DeviceTree.Handler";
const INTERFACE_NAME_RESIZABLE = "org.fedoraproject.Anaconda.Modules.Storage.DeviceTree.Resizable";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/DeviceTree";

export class DeviceTree {
    constructor (deviceTree = OBJECT_PATH) {
        this.deviceTree = deviceTree;
    }

    callViewer (...args) {
        return _callClient(StorageClient, this.deviceTree, INTERFACE_NAME_VIEWER, ...args);
    }

    callResizable (...args) {
        return _callClient(StorageClient, this.deviceTree, INTERFACE_NAME_RESIZABLE, ...args);
    }

    callHandler (...args) {
        return _callClient(StorageClient, this.deviceTree, INTERFACE_NAME_HANDLER, ...args);
    }
}

/**
 * @param {string} device       A device ID
 * @param {string} password     A password
 *
 * @returns {Promise}           Resolves true if success otherwise false
 */
export const unlockDevice = ({ device, passphrase }) => {
    return new DeviceTree().callHandler("UnlockDevice", [device, passphrase]);
};

/**
 * @param {string} disk         A device name
 *
 * @returns {Promise}           Resolves an object with the device data
 */
export const getDeviceData = ({ disk }) => {
    return new DeviceTree().callViewer("GetDeviceData", [disk]);
};

/**
 * @returns {Promise}           Resolves a list with the existing GNU/Linux installations
 */
export const getExistingSystems = () => {
    return new DeviceTree().callViewer("GetExistingSystems", []);
};

/**
 * @param {Array[string]} diskNames A list of disk names
 *
 * @returns {Promise}           Resolves the total free space on the given disks
 */
export const getDiskFreeSpace = ({ diskNames }) => {
    return new DeviceTree().callViewer("GetDiskFreeSpace", [diskNames]);
};

/**
 * @param {string} disk         Name A disk name
 *
 * @returns {Promise}           Resolves the device format data
 */
export const getFormatData = ({ diskName }) => {
    return new DeviceTree().callViewer("GetFormatData", [diskName]);
};

/**
 * @param {Array[string]} mountPoints A list of mount points
 *
 * @returns {Promise}           Resolves total file system free space on given mount points
 */
export const getFileSystemFreeSpace = ({ mountPoints }) => {
    return new DeviceTree().callViewer("GetFileSystemFreeSpace", [mountPoints]);
};

/**
 * @param {int} requiredSpace A required space in bytes
 *
 * @returns {Promise}           Resolves the total free space on the given disks
 */
export const getRequiredDeviceSize = ({ requiredSpace }) => {
    return new DeviceTree().callViewer("GetRequiredDeviceSize", [requiredSpace]);
};

/**
 * @param {Array[string]} diskNames A list of disk names
 *
 * @returns {Promise}           List of mount point constraints for the platform
 */
export const getMountPointConstraints = ({ diskNames }) => {
    return new DeviceTree().callViewer("GetMountPointConstraints", [diskNames]);
};

/**
 * @returns {Promise}           Data static data about a format type
 */
export const getFormatTypeData = ({ formatType }) => {
    return new DeviceTree().callViewer("GetFormatTypeData", [formatType]);
};

/**
 * @param {Array[string]} diskNames A list of disk names
 *
 * @returns {Promise}           Resolves the total space on the given disks
 */
export const getDiskTotalSpace = ({ diskNames }) => {
    return new DeviceTree().callViewer("GetDiskTotalSpace", [diskNames]);
};

/**
 * @returns {Promise}           Resolves all devices in a device tree
 */
export const getDevices = () => {
    return new DeviceTree().callViewer("GetDevices", []);
};

/**
 * @returns {Promise}           Resolves all actions in a device tree
 */
export const getActions = () => {
    return new DeviceTree().callViewer("GetActions", []);
};

/**
 * @returns {Promise}           Resolves all mount points in a device tree
 */
export const getMountPoints = () => {
    return new DeviceTree().callViewer("GetMountPoints", []);
};

export const findExistingSystems = async ({ onFail, onSuccess }) => {
    const tasks = await new StorageClient().client.call(
        OBJECT_PATH,
        INTERFACE_NAME_HANDLER,
        "FindExistingSystemsWithTask", []
    );
    return runStorageTask({
        onFail,
        onSuccess,
        task: tasks[0],
    });
};
