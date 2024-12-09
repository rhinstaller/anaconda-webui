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

/* Get the list of IDs of all the ancestors of the given device
 * (including the device itself)
 * @param {Object} deviceData - The device data object
 * @param {string} device - The ID of the device
 * @returns {Array}
 */
export const getDeviceAncestors = (deviceData, device) => {
    const ancestors = [];
    const deviceParents = deviceData[device]?.parents?.v || [];

    deviceParents.forEach(parent => {
        ancestors.push(parent);
        ancestors.push(...getDeviceAncestors(deviceData, parent));
    });

    return ancestors;
};

/* Get the list of IDs of all the descendants of the given device
 * (including the device itself)
 * @param {string} device - The ID of the device
 * @param {Object} deviceData - The device data object
 * @returns {Array}
 */
export const getDeviceChildren = ({ device, deviceData }) => {
    const deviceChildren = deviceData[device]?.children?.v || [];

    return deviceChildren.reduce((acc, child) => {
        return [...acc, child, ...getDeviceChildren({ device: child, deviceData })];
    }, []);
};

/* Get the list of IDs of all LUKS devices
 * @param {Object} deviceData - The device data object
 * @param {Array} requests - The list of requests from a partitioning
 * @returns {Array}
 */
export const getLockedLUKSDevices = (selectedDisks, deviceData) => {
    // check for selected disks and their children devices for locked LUKS devices
    const relevantDevs = [];
    selectedDisks.forEach(device => {
        const children = getDeviceChildren({ device, deviceData });
        relevantDevs.push(...children);
    });

    return Object.keys(deviceData).filter(d => {
        return (
            relevantDevs.includes(d) &&
            deviceData[d].formatData.type.v === "luks" &&
            deviceData[d].formatData.attrs.v.has_key !== "True"
        );
    });
};

/* Check if the requests array contains duplicate entries
 * @param {Array} requests - The list of requests from a partitioning
 * @param {string} fieldName - The ID of the field to check for duplicates, ex: "mount-point"
 * @returns {boolean}
 */
export const hasDuplicateFields = (requests, fieldName) => {
    let _requests = requests;
    if (fieldName === "mount-point") {
        /* Swap devices have empty mount points and multiple swap devices are allowed
         * so we need to remove these before checking for duplicates
         */
        _requests = requests.filter(r => r["format-type"] !== "swap");
    }
    const items = _requests.map(r => r[fieldName]);

    return new Set(items).size !== items.length;
};

/* Check if the requests array contains duplicate entries for a given field value
 * @param {Array} requests - The list of requests from a partitioning
 * @param {string} fieldName - The name of the field to check for duplicates, ex: "mount-point"
 * @param {string} fieldValue - The value of the field to check for duplicates, ex: "/boot"
 * @returns {boolean}
 */
export const isDuplicateRequestField = (requests, fieldName, fieldValue) => {
    return requests.filter((request) => request[fieldName] === fieldValue).length > 1;
};

export const getDeviceByPath = (deviceData, path) => {
    return Object.keys(deviceData).find(d => deviceData[d].path?.v === path || deviceData[d].links?.v.includes(path));
};

export const getDeviceByName = (deviceData, name) => {
    return Object.keys(deviceData).find(d => deviceData[d].name?.v === name);
};

/* Check if a device has a LUKS encrypted parent
 * @param {Object} deviceData - The device data object
 * @param {string} device - The ID of the device
 * @returns {boolean}
 * */
export const hasEncryptedAncestor = (deviceData, device) => {
    if (deviceData[device].type.v === "luks/dm-crypt") {
        return true;
    }

    const parent = deviceData[device].parents.v?.[0];

    if (parent) {
        return hasEncryptedAncestor(deviceData, parent);
    } else {
        return false;
    }
};

/* Get the parent partitions IDs of a given device
 * @param {Object} deviceData - The device data object
 * @param {string} device - The ID of the device
 * @returns {Array}
 * */
export const getParentPartitions = (deviceData, device) => {
    if (deviceData[device].type.v === "partition") {
        return [device];
    }

    return deviceData[device].parents.v.map(parent => getParentPartitions(deviceData, parent)).flat(Infinity);
};

/* Check if a device has parents of a given type
 * @param {Object} deviceData - The device data object
 * @param {string} device - The ID of the device
 * @param {string} type - The type of the device to check for
 * @returns {boolean}
 * */
export const checkDeviceOnStorageType = (deviceData, device, type) => {
    if (deviceData[device].type.v === type) {
        return true;
    }

    return deviceData[device].parents.v?.some(parent => checkDeviceOnStorageType(deviceData, parent, type));
};

export const getDeviceTypeInfo = (device) => {
    const deviceType = device.type.v;
    const deviceFormatType = device.formatData.type.v;

    if (deviceType === "partition") {
        return deviceFormatType;
    }
    return deviceType;
};

/* Match the units to their respective sizes */
export const unitMultiplier = {
    B: 1,
    KB: 1000,
    MB: 1000000,
    // eslint-disable-next-line sort-keys
    GB: 1000000000,
    TB: 1000000000000,
};

export const bootloaderTypes = ["efi", "biosboot", "appleboot", "prepboot"];
