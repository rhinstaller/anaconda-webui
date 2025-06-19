/*
 * Copyright (C) 2025 Red Hat, Inc.
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

import { _callClient } from "./helpers.js";

import { StorageClient } from "./storage.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Storage.Checker";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/Checker";

const callClient = (...args) => {
    return _callClient(StorageClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

/**
 * @param {string} size       Storage size in bytes required for the system
 */
export const setSystemSizeConstraint = ({ size }) => {
    // STORAGE_REQ_SYSTEM_SIZE constraint
    return callClient("SetConstraint", ["req_system_size", cockpit.variant("t", size)]);
};
