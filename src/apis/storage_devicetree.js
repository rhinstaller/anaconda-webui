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

import { StorageClient } from "./storage.js";

const INTERFACE_NAME_VIEWER = "org.fedoraproject.Anaconda.Modules.Storage.DeviceTree.Viewer";
const INTERFACE_NAME_HANDLER = "org.fedoraproject.Anaconda.Modules.Storage.DeviceTree.Handler";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/DeviceTree";

const callViewer = (...args) => {
    return _callClient(StorageClient, OBJECT_PATH, INTERFACE_NAME_VIEWER, ...args);
};
const callHandler = (...args) => {
    return _callClient(StorageClient, OBJECT_PATH, INTERFACE_NAME_HANDLER, ...args);
};

/**
 * @param {string} deviceName   A device name
 * @param {string} password     A password
 *
 * @returns {Promise}           Resolves true if success otherwise false
 */
export const unlockDevice = ({ deviceName, passphrase }) => {
    return callHandler("UnlockDevice", [deviceName, passphrase]);
};

/**
 * @param {string} disk         A device name
 *
 * @returns {Promise}           Resolves an object with the device data
 */
export const getDeviceData = ({ disk }) => {
    return callViewer("GetDeviceData", [disk]);
};

/**
 * @param {Array[string]} diskNames A list of disk names
 *
 * @returns {Promise}           Resolves the total free space on the given disks
 */
export const getDiskFreeSpace = ({ diskNames }) => {
    return callViewer("GetDiskFreeSpace", [diskNames]);
};

/**
 * @param {string} disk         Name A disk name
 *
 * @returns {Promise}           Resolves the device format data
 */
export const getFormatData = ({ diskName }) => {
    return callViewer("GetFormatData", [diskName]);
};

/**
 * @param {int} requiredSpace A required space in bytes
 *
 * @returns {Promise}           Resolves the total free space on the given disks
 */
export const getRequiredDeviceSize = ({ requiredSpace }) => {
    return callViewer("GetRequiredDeviceSize", [requiredSpace]);
};

/**
 * @returns {Promise}           List of mount point constraints for the platform
 */
export const getMountPointConstraints = () => {
    return callViewer("GetMountPointConstraints", []);
};

/**
 * @returns {Promise}           Data static data about a format type
 */
export const getFormatTypeData = ({ formatType }) => {
    return callViewer("GetFormatTypeData", [formatType]);
};

/**
 * @param {Array[string]} diskNames A list of disk names
 *
 * @returns {Promise}           Resolves the total space on the given disks
 */
export const getDiskTotalSpace = ({ diskNames }) => {
    return callViewer("GetDiskTotalSpace", [diskNames]);
};

/**
 * @returns {Promise}           Resolves all devices in a device tree
 */
export const getDevices = () => {
    return callViewer("GetDevices", []);
};

/**
 * @returns {Promise}           Resolves all mount points in a device tree
 */
export const getMountPoints = () => {
    return callViewer("GetMountPoints", []);
};
