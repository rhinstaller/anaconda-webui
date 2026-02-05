/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { _getProperty, _setProperty } from "./helpers.js";

import { StorageClient } from "./storage.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Storage.DiskInitialization";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/DiskInitialization";

const getProperty = (...args) => {
    return _getProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const setProperty = (...args) => {
    return _setProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

/**
 * @returns {Promise}           The number of the mode
 */
export const getInitializationMode = () => {
    return getProperty("InitializationMode");
};

/**
 * @param {int} mode            The number of the mode
 */
export const setInitializationMode = ({ mode }) => {
    return setProperty("InitializationMode", cockpit.variant("i", mode));
};

/**
 * @param {boolean} enabled     True if allowed, otherwise False
 */
export const setInitializeLabelsEnabled = ({ enabled }) => {
    return setProperty("InitializeLabelsEnabled", cockpit.variant("b", enabled));
};
