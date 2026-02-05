/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { DeviceTree } from "./storage_devicetree.js";

/**
 * @param {string} device       A device ID
 * @param {object} deviceTree   The device tree
 *
 * @returns {Promise}           Resolves or rejects the result of the operation
 */
export const removeDevice = ({ device, deviceTree }) => {
    return new DeviceTree(deviceTree).callResizable("RemoveDevice", [device]);
};

/**
 * @param {string} device       A device ID
 * @param {number} newSize      The new size of the device
 * @param {object} deviceTree   The device tree
 *
 * @returns {Promise}           Resolves or rejects the result of the operation
 */
export const shrinkDevice = ({ device, deviceTree, newSize }) => {
    return new DeviceTree(deviceTree).callResizable("ShrinkDevice", [device, newSize]);
};

/**
 * @param {string} device       A device ID
 *
 * @returns {Promise}           Resolves or rejects the result of the operation
 *                              The result is a boolean indicating whether the device is shrinkable
 *                             or not
 */
export const isDeviceShrinkable = ({ device, deviceTree }) => {
    return new DeviceTree(deviceTree).callResizable("IsDeviceShrinkable", [device]);
};
