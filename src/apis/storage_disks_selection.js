/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { _callClient, _getProperty, _setProperty } from "./helpers.js";

import { StorageClient } from "./storage.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Storage.DiskSelection";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/DiskSelection";

const callClient = (...args) => {
    return _callClient(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const setProperty = (...args) => {
    return _setProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const getProperty = (...args) => {
    return _getProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
/**
 * @returns {Promise}           Resolves all properties of DiskSelection interface
 */
export const getAllDiskSelection = () => {
    return new StorageClient().client.call(OBJECT_PATH, "org.freedesktop.DBus.Properties", "GetAll", [INTERFACE_NAME]);
};

/**
 * @returns {Promise}           Resolves a list with disk names
 */
export const getUsableDisks = () => {
    return callClient("GetUsableDisks", []);
};

/**
 * @returns {Promise}           The list of selected disks
 */
export const getSelectedDisks = () => {
    return getProperty("SelectedDisks");
};

/**
 * @param {Array.<string>} drives A list of drives names
 */
export const setSelectedDisks = ({ drives }) => {
    return setProperty("SelectedDisks", cockpit.variant("as", drives));
};
