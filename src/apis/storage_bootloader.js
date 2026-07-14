/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { _getProperty, _setProperty } from "./helpers.js";

import { StorageClient } from "./storage.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Storage.Bootloader";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/Bootloader";

const getProperty = (...args) => {
    return _getProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

const setProperty = (...args) => {
    return _setProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export const getBootloaderDrive = () => {
    return getProperty("Drive");
};

/**
 * @param {string} drive     A drive name
 */
export const setBootloaderDrive = ({ drive }) => {
    return setProperty("Drive", cockpit.variant("s", drive));
};
