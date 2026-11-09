/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import {
    bootloaderTypes,
    getDeviceDisk,
} from "../helpers/storage.js";
import { _callClient, _getProperty } from "./helpers.js";

import {
    runStorageTaskAsync,
    StorageClient,
} from "./storage.js";
import {
    getBootloaderDrive,
    setBootloaderDrive,
} from "./storage_bootloader.js";
import {
    getDeviceData,
    getDevices,
    getFormatData,
    getMountPoints,
} from "./storage_devicetree.js";
import {
    getSelectedDisks,
} from "./storage_disks_selection.js";

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

const parsePartitioningScheme = (scheme) => ({
    hasFileSystemType: scheme["has-file-system-type"].v,
    id: scheme["scheme-id"].v,
});

/**
 * @returns {Promise<string>}   Default automatic partitioning scheme id (e.g. "BTRFS")
 */
export const getDefaultPartitioningScheme = () => {
    return callClient("GetDefaultPartitioningScheme", []);
};

/**
 * @returns {Promise<Array>}    Supported automatic partitioning schemes from the backend
 */
export const getSupportedPartitioningSchemes = async () => {
    const schemes = await callClient("GetSupportedPartitioningSchemes", []);
    return schemes.map(parsePartitioningScheme);
};

/**
 * @returns {Promise<string>}   Default file system type for automatic partitioning (e.g. "ext4")
 */
export const getDefaultFileSystemType = () => {
    return callClient("GetDefaultFileSystemType", []);
};

/**
 * @returns {Promise<string[]>} File system types an automatic partitioning request can ask for
 */
export const getSupportedFileSystemTypes = () => {
    return callClient("GetSupportedFileSystemTypes", []);
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

const configurationSchemeToDBus = {
    BTRFS: cockpit.variant("i", 1),
    LVM: cockpit.variant("i", 2),
    LVM_THINP: cockpit.variant("i", 3),
    PLAIN: cockpit.variant("i", 0),
    STRATIS: cockpit.variant("i", 4),
};

/* Create DBus request object for home reuse partitioning
 * @param {string} scheme           autopartitioning scheme
 * @param {string} reuseEFIPart     should EFI partition be reused ?
 */
export const getAutopartReuseDBusRequest = ({ reuseEFIPart, scheme }) => {
    const request = {
        "partitioning-scheme": configurationSchemeToDBus?.[scheme],
    };

    const reused = reuseEFIPart ? ["/home", "/boot/efi"] : ["/home"];
    request["reused-mount-points"] = cockpit.variant("as", reused);
    if (scheme === "PLAIN") {
        // "/" will be reallocated by autopartitioning
        const removed = reuseEFIPart ? ["/", "/boot"] : ["/", "/boot", "bootloader"];
        request["removed-mount-points"] = cockpit.variant("as", removed);
    } else {
        // "LVM", "BTRFS", "LVM_THINP", "STRATIS"
        // "/" can't be reallocated by autopartitioning as it is sharing container device with /home
        const removed = reuseEFIPart ? ["/boot"] : ["/boot", "bootloader"];
        request["removed-mount-points"] = cockpit.variant("as", removed);
        request["reformatted-mount-points"] = cockpit.variant("as", ["/"]);
    }
    return request;
};

/**
 * @param {string} partitioning     DBus path to a partitioning
 * @param {string} homeReuseOptions options for home reuse partitioning requests
 */
export const partitioningSetHomeReuse = async ({ homeReuseOptions, partitioning }) => {
    const autopartRequest = await getPartitioningRequest({ partitioning });
    const reuseRequest = getAutopartReuseDBusRequest(homeReuseOptions);
    const request = { ...autopartRequest, ...reuseRequest };

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

const partitioningValidateAsync = async ({ partitioning }) => {
    const tasks = await new StorageClient().client.call(
        partitioning,
        INTERFACE_NAME_PARTITIONING,
        "ValidateWithTask", []
    );
    return runStorageTaskAsync({
        onSuccess: async () => {
            const taskProxy = new StorageClient().client.proxy(
                "org.fedoraproject.Anaconda.Task",
                tasks[0]
            );
            const result = await taskProxy.GetResult();
            return result.v;
        },
        task: tasks[0],
    });
};

const parseStorageValidationReport = (validationReport) => ({
    errors: validationReport?.["error-messages"]?.v || [],
    warnings: validationReport?.["warning-messages"]?.v || [],
});

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

/**
 * Build an automatic partitioning request from the storage configuration UI.
 *
 * @param {Object} baseRequest  Existing request whose other fields should be preserved
 * @param {string[]} excluded   Mount points to leave out of the default layout
 * @param {string} fileSystem   File system for schemes that allow a choice
 * @param {boolean} hasFileSystemType Whether the scheme accepts a file system type
 * @param {string} scheme       Partitioning scheme id, e.g. "BTRFS"
 *
 * @returns {Object}            A DBus request object
 */
export const getAutopartDBusRequest = ({ baseRequest = {}, excluded, fileSystem, hasFileSystemType, scheme }) => {
    const request = {
        ...baseRequest,
        "excluded-mount-points": cockpit.variant("as", excluded),
        "partitioning-scheme": configurationSchemeToDBus[scheme],
    };

    if (hasFileSystemType && fileSystem) {
        request["file-system-type"] = cockpit.variant("s", fileSystem);
    } else {
        delete request["file-system-type"];
    }

    return request;
};

const configurationSchemeFromDBus = Object.fromEntries(
    Object.entries(configurationSchemeToDBus).map(([scheme, { v }]) => [v, scheme])
);

/**
 * Read the storage configuration UI state back out of an automatic partitioning
 * request. The inverse of getAutopartDBusRequest.
 *
 * @param {Object} request          An automatic partitioning request from the store
 * @param {string} defaultFileSystem File system to report when the request leaves it open
 *
 * @returns {Object}                The configuration the request describes
 */
export const getAutopartConfiguration = (request, defaultFileSystem) => ({
    excluded: request["excluded-mount-points"] || [],
    fileSystem: request["file-system-type"] || defaultFileSystem,
    scheme: configurationSchemeFromDBus[request["partitioning-scheme"]],
});

/**
 * Read the layout of a created partitioning through the existing device tree API.
 *
 * @param {string} partitioning DBus path to a partitioning
 *
 * @returns {Promise}           Resolves the mounted devices and swap
 */
export const getPartitioningLayout = async ({ partitioning }) => {
    const deviceTree = await getDeviceTree({ partitioning });
    const [mountPoints, deviceIds] = await Promise.all([
        getMountPoints({ deviceTree }),
        getDevices({ deviceTree }),
    ]);

    const devices = await Promise.all(deviceIds.map(async deviceId => {
        const [device, formatData] = await Promise.all([
            getDeviceData({ deviceTree, disk: deviceId }),
            getFormatData({ deviceTree, diskName: deviceId }),
        ]);

        return { ...device, formatData };
    }));

    const mountPointByDevice = Object.fromEntries(
        Object.entries(mountPoints).map(([mountPoint, deviceId]) => [deviceId, mountPoint])
    );

    return devices.flatMap(device => {
        const deviceId = device["device-id"].v;
        const format = device.formatData.type.v;
        const mountPoint = mountPointByDevice[deviceId];

        if (mountPoint === undefined && format !== "swap") {
            return [];
        }

        return [{
            deviceName: device.name.v,
            format,
            mountPoint: mountPoint || "",
            size: device.size.v,
        }];
    });
};

/**
 * Create and set up an automatic partitioning request.
 *
 * The request becomes the current partitioning. With configure=true, run the
 * regular configuration task so its layout can be read. Without it, leave the
 * partitioning ready for applyStorage to configure exactly once.
 *
 * @param {Object} request      An automatic partitioning request
 * @param {boolean} configure   Whether to configure the partitioning immediately
 *
 * @returns {Promise}           Resolves the partitioning path and optional layout
 */
export const createPartitioningFromRequest = async ({ configure = false, request }) => {
    const partitioning = await createPartitioning({ method: "AUTOMATIC" });
    await setPartitioningRequest({ partitioning, request });

    if (!configure) {
        return { partitioning };
    }

    const tasks = await partitioningConfigureWithTask({ partitioning });
    await runStorageTaskAsync({ task: tasks[0] });

    return {
        layout: await getPartitioningLayout({ partitioning }),
        partitioning,
    };
};

export const applyStorage = async ({ devices, luks, partitioning }) => {
    if (luks?.encrypted !== undefined) {
        await partitioningSetEncrypt({ encrypt: luks.encrypted, partitioning });
    }
    if (luks?.passphrase) {
        await partitioningSetPassphrase({ partitioning, passphrase: luks.passphrase });
    }

    const [currentBootDrive, selectedDisks] = await Promise.all([
        getBootloaderDrive(),
        getSelectedDisks(),
    ]);
    const shouldResetBootDrive = currentBootDrive && !selectedDisks?.includes(currentBootDrive);

    const method = await getPartitioningMethod({ partitioning });
    if (method === "MANUAL") {
        const requests = await gatherRequests({ partitioning });
        const bootloaderDevice = requests.find(request => bootloaderTypes.includes(request["format-type"].v))?.["device-spec"].v;
        const bootloaderDisk = getDeviceDisk(devices, bootloaderDevice);
        const rootDevice = requests.find(request => request["mount-point"].v === "/")?.["device-spec"].v;
        const rootDisk = getDeviceDisk(devices, rootDevice);

        if (bootloaderDisk !== rootDisk && !!bootloaderDisk) {
            await setBootloaderDrive({ drive: bootloaderDisk });
        } else if (shouldResetBootDrive || !currentBootDrive) {
            await setBootloaderDrive({ drive: "" });
        }
    } else if (shouldResetBootDrive) {
        await setBootloaderDrive({ drive: "" });
    }

    const configureTasks = await partitioningConfigureWithTask({ partitioning });

    const validationReport = await runStorageTaskAsync({
        onSuccess: async () => {
            await applyPartitioning({ partitioning });
            return partitioningValidateAsync({ partitioning });
        },
        task: configureTasks[0],
    });

    const { errors, warnings } = parseStorageValidationReport(validationReport);

    return { errors, validationReport, warnings };
};
