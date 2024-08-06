/*
 * Copyright (C) 2024 Red Hat, Inc.
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
