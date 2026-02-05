/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { _setProperty } from "./helpers.js";

import { StorageClient } from "./storage.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Storage.Bootloader";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/Bootloader";

const setProperty = (...args) => {
    return _setProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

/**
 * @param {string} drive     A drive name
 */
export const setBootloaderDrive = ({ drive }) => {
    return setProperty("Drive", cockpit.variant("s", drive));
};
