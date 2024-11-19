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
import cockpit from "cockpit";

import { _callClient, _getProperty } from "./helpers.js";

import {
    runStorageTask,
    StorageClient,
} from "./storage.js";

const INTERFACE_NAME_STORAGE = "org.fedoraproject.Anaconda.Modules.Storage";
const INTERFACE_NAME_PARTITIONING = "org.fedoraproject.Anaconda.Modules.Storage.Partitioning";
const INTERFACE_NAME_PARTITIONING_MANUAL = "org.fedoraproject.Anaconda.Modules.Storage.Partitioning.Manual";
const INTERFACE_NAME_PARTITIONING_AUTOMATIC = "org.fedoraproject.Anaconda.Modules.Storage.Partitioning.Automatic";
const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage";

const callClient = (...args) => {
    return _callClient(StorageClient, OBJECT_PATH, INTERFACE_NAME_STORAGE, ...args);
};
const getProperty = (...args) => {
    return _getProperty(StorageClient, OBJECT_PATH, INTERFACE_NAME_STORAGE, ...args);
};
const getPropertyAutomatic = (path, ...args) => {
    return _getProperty(StorageClient, path, INTERFACE_NAME_PARTITIONING_AUTOMATIC, ...args);
};

/**
 * @param {string} partitioning DBus path to a partitioning
 *
 * @returns {Promise}           Resolves the DBus path to the partitioning
 */
export const applyPartitioning = ({ partitioning }) => {
    return callClient("ApplyPartitioning", [partitioning]);
};

/**
 * @param {string} method       A partitioning method
 *
 * @returns {Promise}           Resolves the DBus path to the partitioning
 */
export const createPartitioning = ({ method }) => {
    return callClient("CreatePartitioning", [method]);
};

/**
 * @param {string} partitioning DBus path to a partitioning
 *
 * @returns {Promise}           The device tree object
 */
export const getDeviceTree = ({ partitioning }) => {
    return new StorageClient().client.call(
        partitioning,
        INTERFACE_NAME_PARTITIONING,
        "GetDeviceTree",
        []
    ).then(res => res[0]);
};

/**
 * @param {string} partitioning    DBus path to a partitioning
 * @param {string} passphrase      passphrase for disk encryption
 */
export const partitioningSetPassphrase = ({ partitioning, passphrase }) => {
    return new StorageClient().client.call(
        partitioning,
        INTERFACE_NAME_PARTITIONING_AUTOMATIC,
        "SetPassphrase", [passphrase]
    );
};

/**
 * @param {string} partitioning     DBus path to a partitioning
 * @param {boolean} encrypt         True if partitions should be encrypted, False otherwise
 */
export const partitioningSetEncrypt = ({ encrypt, partitioning }) => {
    return getPartitioningRequest({ partitioning })
            .then(request => {
                request.encrypted = cockpit.variant("b", encrypt);
                return setPartitioningRequest({ partitioning, request });
            });
};

/**
 * @param {string} partitioning     DBus path to a partitioning
 * @param {string} scheme           autopartitioning scheme
 */
export const partitioningSetHomeReuse = async ({ partitioning, scheme }) => {
    const request = await getPartitioningRequest({ partitioning });

    const configurationSchemeToDBus = {
        BTRFS: cockpit.variant("i", 1),
        LVM: cockpit.variant("i", 2),
        LVM_THINP: cockpit.variant("i", 3),
        PLAIN: cockpit.variant("i", 0),
    };
    request["partitioning-scheme"] = configurationSchemeToDBus?.[scheme];

    request["reused-mount-points"] = cockpit.variant("as", ["/home"]);
    if (scheme === "PLAIN") {
        // "/" will be reallocated by autopartitioning
        request["removed-mount-points"] = cockpit.variant("as", ["/", "/boot", "bootloader"]);
    } else {
        // "LVM", "BTRFS", "LVM_THINP"
        // "/" can't be reallocated by autopartitioing as it is sharing container device with /home
        request["removed-mount-points"] = cockpit.variant("as", ["/boot", "bootloader"]);
        request["reformatted-mount-points"] = cockpit.variant("as", ["/"]);
    }

    await setPartitioningRequest({ partitioning, request });
};

/**
 * @returns {Promise}           The request of automatic partitioning
 */
export const getPartitioningRequest = ({ partitioning }) => {
    return (
        new StorageClient().client.call(
            partitioning,
            "org.freedesktop.DBus.Properties",
            "Get",
            [
                INTERFACE_NAME_PARTITIONING_AUTOMATIC,
                "Request",
            ]
        )
                .then(res => res[0].v)
    );
};

/**
 * @param {string} partitioning     DBus path to a partitioning
 *
 * @returns {Promise}               The partitioning method
 */
export const getPartitioningMethod = ({ partitioning }) => {
    return (
        new StorageClient().client.call(
            partitioning,
            "org.freedesktop.DBus.Properties",
            "Get",
            [
                INTERFACE_NAME_PARTITIONING,
                "PartitioningMethod",
            ]
        )
                .then(res => res[0].v)
    );
};

/**
 * @returns {Promise}           The applied partitioning
 */
export const getAppliedPartitioning = () => {
    return getProperty("AppliedPartitioning");
};

/**
 * @returns {Promise}           The applied partitioning
 */
export const getAutomaticPartitioningRequest = ({ partitioning }) => {
    return getPropertyAutomatic(partitioning, "Request");
};

/**
 * @param {string} partitioning     DBus path to a partitioning
 * @param {Object} request          A data object with the request
 */
export const setPartitioningRequest = ({ partitioning, request }) => {
    return new StorageClient().client.call(
        partitioning,
        "org.freedesktop.DBus.Properties",
        "Set",
        [
            INTERFACE_NAME_PARTITIONING_AUTOMATIC,
            "Request",
            cockpit.variant("a{sv}", request)
        ]
    );
};

/**
 * @param {string} partitioning DBus path to a partitioning
 *
 * @returns {Promise}           Resolves a DBus path to a task
 */
export const partitioningConfigureWithTask = ({ partitioning }) => {
    return new StorageClient().client.call(
        partitioning,
        INTERFACE_NAME_PARTITIONING,
        "ConfigureWithTask", []
    );
};

export const resetPartitioning = () => {
    return callClient("ResetPartitioning", []);
};

/*
 * @param {string} partitioning DBus path to a partitioning
 * @param {Array.<Object>} requests An array of request objects
 */
export const setManualPartitioningRequests = ({ partitioning, requests }) => {
    return new StorageClient().client.call(
        partitioning,
        "org.freedesktop.DBus.Properties",
        "Set",
        [
            INTERFACE_NAME_PARTITIONING_MANUAL,
            "Requests",
            cockpit.variant("aa{sv}", requests)
        ]
    );
};

/**
 * @param {string} partitioning DBus path to a partitioning
 *
 * @returns {Promise}           The gathered requests for manual partitioning
 */
export const gatherRequests = ({ partitioning }) => {
    return new StorageClient().client.call(
        partitioning,
        INTERFACE_NAME_PARTITIONING_MANUAL,
        "GatherRequests",
        []
    ).then(res => res[0]);
};

export const applyStorage = async ({ luks, onFail, onSuccess, partitioning }) => {
    if (luks?.encrypted !== undefined) {
        await partitioningSetEncrypt({ encrypt: luks.encrypted, partitioning });
    }
    if (luks?.passphrase) {
        await partitioningSetPassphrase({ partitioning, passphrase: luks.passphrase });
    }

    const tasks = await partitioningConfigureWithTask({ partitioning });

    runStorageTask({
        onFail,
        onSuccess: () => applyPartitioning({ partitioning })
                .then(onSuccess)
                .catch(onFail),
        task: tasks[0]
    });
};
