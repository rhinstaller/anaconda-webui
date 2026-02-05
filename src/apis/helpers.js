/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

export const _callClient = (Client, OBJECT_PATH, INTERFACE_NAME, ...args) => {
    return new Client().client.call(OBJECT_PATH, INTERFACE_NAME, ...args).then(res => res[0]);
};

export const _setProperty = (Client, OBJECT_PATH, INTERFACE_NAME, ...args) => {
    return new Client().client.call(
        OBJECT_PATH, "org.freedesktop.DBus.Properties", "Set", [INTERFACE_NAME, ...args]
    );
};

export const _getProperty = (Client, OBJECT_PATH, INTERFACE_NAME, ...args) => {
    return new Client().client.call(
        OBJECT_PATH, "org.freedesktop.DBus.Properties", "Get", [INTERFACE_NAME, ...args]
    ).then(res => res[0].v);
};

/**
 * Convert a DBus object (a{sv}) to a plain JavaScript object by extracting .v from variant values
 * @param {Object} obj - DBus object with variant values
 * @returns {Object} Plain JavaScript object
 */
export const objectFromDbus = (obj) => {
    return Object.entries(obj).reduce((acc, [key, value]) => ({ ...acc, [key]: value.v }), {});
};

/**
 * Convert an array of DBus objects to an array of plain JavaScript objects
 * @param {Array} items - Array of DBus objects with variant values
 * @returns {Array} Array of plain JavaScript objects
 */
export const objectsFromDbus = (items) => {
    return items.map(item => Object.entries(item).reduce((acc, [key, value]) => ({ ...acc, [key]: value.v }), {}));
};

/**
 * Convert a plain JavaScript object to a DBus structure (a{sv}) by wrapping values in variants
 * @param {Object} obj - Plain JavaScript object
 * @returns {Object} DBus structure with variant-wrapped values
 */
export const objectToDbus = (obj) => {
    const structure = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
            continue;
        }

        // Infer DBus type from JavaScript value type
        let dbusType;
        if (typeof value === "boolean") {
            dbusType = "b";
        } else if (typeof value === "string") {
            dbusType = "s";
        } else if (Array.isArray(value)) {
            // Default to array of strings
            dbusType = "as";
        } else if (typeof value === "object") {
            // Check for a{saas} (dictionary of string to array of arrays of strings)
            const entries = Object.entries(value);
            if (entries.length > 0 && Array.isArray(entries[0][1]) && entries[0][1].length > 0 && Array.isArray(entries[0][1][0])) {
                dbusType = "a{saas}";
            } else {
                // Default to a{sv} (dictionary of string to variant)
                dbusType = "a{sv}";
            }
        }

        structure[key] = cockpit.variant(dbusType, value);
    }

    return structure;
};
