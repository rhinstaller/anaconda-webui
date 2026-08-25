/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { _getProperty, objectFromDbus, objectToDbus } from "./helpers.js";

import { PayloadDNFClient } from "./payload_dnf.js";
import { PayloadsClient } from "./payloads.js";

const PAYLOADS_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Payloads";
const PAYLOADS_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads";
const PAYLOAD_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Payload";
const SOURCE_BASE_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Source";
const SOURCE_REPOSITORY_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Source.Repository";
const SOURCE_CLOSEST_MIRROR_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Source.ClosestMirror";
const SOURCE_CDROM_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Source.CDROM";
const SOURCE_REPO_PATH_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Source.RepoPath";

const getClient = () => new PayloadsClient().client;

const getPayloadPath = () => PayloadDNFClient.instance.payload;

/**
 * Create a new source of the given type.
 * @param {string} sourceType - e.g. "URL"
 * @returns {Promise<string>} D-Bus object path of the created source
 */
export const createSource = async (sourceType) => {
    return getClient().call(
        PAYLOADS_OBJECT_PATH, PAYLOADS_INTERFACE, "CreateSource", [sourceType]
    )
            .then(res => res[0]);
};

/**
 * Get the list of source object paths attached to the current payload.
 * @returns {Promise<string[]>}
 */
export const getPayloadSources = async () => {
    return _getProperty(
        PayloadsClient, getPayloadPath(), PAYLOAD_INTERFACE, "Sources"
    );
};

/**
 * Set the sources on the current payload.
 * @param {string[]} sources - Array of source D-Bus object paths
 */
export const setPayloadSources = async (sources) => {
    return getClient().call(
        getPayloadPath(), "org.freedesktop.DBus.Properties", "Set",
        [PAYLOAD_INTERFACE, "Sources", cockpit.variant("ao", sources)]
    );
};

/**
 * Get the Type property from a source object.
 * @param {string} sourcePath - D-Bus object path
 * @returns {Promise<string>}
 */
export const getSourceType = async (sourcePath) => {
    return _getProperty(PayloadsClient, sourcePath, SOURCE_BASE_INTERFACE, "Type");
};

/**
 * Get the RepoConfigurationData from a URL source.
 * @param {string} sourcePath - D-Bus object path
 * @returns {Promise<Object>} Plain JS object
 */
export const getSourceConfiguration = async (sourcePath) => {
    const structure = await _getProperty(
        PayloadsClient, sourcePath, SOURCE_REPOSITORY_INTERFACE, "Configuration"
    );
    return objectFromDbus(structure);
};

/**
 * Set the RepoConfigurationData on a URL source.
 * @param {string} sourcePath - D-Bus object path
 * @param {Object} config - Plain JS object with url, type, ssl-verification-enabled
 */
export const setSourceConfiguration = async (sourcePath, config) => {
    const structure = objectToDbus(config);
    return getClient().call(
        sourcePath, "org.freedesktop.DBus.Properties", "Set",
        [SOURCE_REPOSITORY_INTERFACE, "Configuration", cockpit.variant("a{sv}", structure)]
    );
};

/**
 * Get UpdatesEnabled from a closest-mirror source.
 * @param {string} sourcePath
 * @returns {Promise<boolean>}
 */
export const getUpdatesEnabled = async (sourcePath) => {
    return _getProperty(
        PayloadsClient, sourcePath, SOURCE_CLOSEST_MIRROR_INTERFACE, "UpdatesEnabled"
    );
};

/**
 * Set UpdatesEnabled on a closest-mirror source.
 * @param {string} sourcePath
 * @param {boolean} enabled
 */
export const setUpdatesEnabled = async (sourcePath, enabled) => {
    return getClient().call(
        sourcePath, "org.freedesktop.DBus.Properties", "Set",
        [SOURCE_CLOSEST_MIRROR_INTERFACE, "UpdatesEnabled", cockpit.variant("b", enabled)]
    );
};

/**
 * Run a D-Bus task to completion.
 * @param {Object} params
 * @param {string} params.task - D-Bus object path of the task
 * @returns {Promise<void>}
 */
export const runPayloadTask = ({ task }) => {
    return new Promise((resolve, reject) => {
        let succeededEmitted = false;
        const taskProxy = getClient().proxy(
            "org.fedoraproject.Anaconda.Task",
            task
        );
        const addEventListeners = () => {
            taskProxy.addEventListener("Stopped", () => taskProxy.Finish().catch(reject));
            taskProxy.addEventListener("Succeeded", () => {
                if (succeededEmitted) {
                    return;
                }
                succeededEmitted = true;
                resolve();
            });
        };
        taskProxy.wait(() => {
            addEventListeners();
            taskProxy.Start().catch(reject);
        });
    });
};

/**
 * Tear down the current sources on the payload.
 * @returns {Promise<void>}
 */
export const tearDownSources = async () => {
    const task = await getClient().call(
        getPayloadPath(), PAYLOAD_INTERFACE, "TearDownSourcesWithTask", []
    )
            .then(res => res[0]);
    return runPayloadTask({ task });
};

/**
 * Set up the sources on the payload.
 * @returns {Promise<void>}
 */
export const setUpSources = async () => {
    const task = await getClient().call(
        getPayloadPath(), PAYLOAD_INTERFACE, "SetUpSourcesWithTask", []
    )
            .then(res => res[0]);
    return runPayloadTask({ task });
};

/**
 * Get the DeviceID from a CDROM source.
 * @param {string} sourcePath
 * @returns {Promise<string>}
 */
export const getCdromDeviceId = async (sourcePath) => {
    return _getProperty(PayloadsClient, sourcePath, SOURCE_CDROM_INTERFACE, "DeviceID");
};

/**
 * Get the Path from a REPO_PATH source.
 * @param {string} sourcePath
 * @returns {Promise<string>}
 */
export const getRepoPath = async (sourcePath) => {
    return _getProperty(PayloadsClient, sourcePath, SOURCE_REPO_PATH_INTERFACE, "Path");
};
