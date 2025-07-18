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

import { error } from "../helpers/log.js";
import { _callClient, _getProperty, _setProperty } from "./helpers.js";

const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Timezone";
const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Timezone";

/**
 * Helper for DBus Timezone API.
 */
const callClient = (...args) => {
    return _callClient(TimezoneClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const setProperty = (...args) => {
    return _setProperty(TimezoneClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const getProperty = (...args) => {
    return _getProperty(TimezoneClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export class TimezoneClient {
    constructor (address, dispatch) {
        if (TimezoneClient.instance && (!address || TimezoneClient.instance.address === address)) {
            return TimezoneClient.instance;
        }

        TimezoneClient.instance?.client.close();
        TimezoneClient.instance = this;

        this.client = cockpit.dbus(
            INTERFACE_NAME,
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
        this.dispatch = dispatch;
    }

    async init () {
        this.client.addEventListener("close", () => error("Timezone client closed"));
        // You can subscribe to DBus signals here if needed.
    }
}

/**
 * Gets the current timezone string.
 * @returns {Promise<string>} Resolves with the current timezone (e.g. 'Europe/Prague')
 */
export const getTimezone = () => {
    return getProperty("Timezone");
};

/**
 * Sets the system timezone (priority 90 = user action).
 * @param {Object} params
 * @param {string} params.timezone - The timezone to set (e.g. 'Europe/Prague')
 * @returns {Promise<void>}
 */
export const setTimezone = ({ timezone }) => {
    return callClient("SetTimezoneWithPriority", [timezone, 90]);
};

/**
 * Sets the system timezone with a custom priority.
 * @param {Object} params
 * @param {string} params.timezone - The timezone to set (e.g. 'Europe/Prague')
 * @param {number} params.priority - The priority (e.g. 90)
 * @returns {Promise<void>}
 */
export const setTimezoneWithPriority = ({ priority, timezone }) => {
    return callClient("SetTimezoneWithPriority", [timezone, priority]);
};

/**
 * Gets a list of all valid timezones, grouped by region.
 * @returns {Promise<Object>} Resolves with a dictionary {Region: [cities...]}
 */
export const getAllValidTimezones = () => {
    return callClient("GetAllValidTimezones");
};

/**
 * Returns true if the hardware clock is set to UTC.
 * @returns {Promise<boolean>} Resolves with true if set to UTC, false otherwise.
 */
export const getIsUTC = () => {
    return getProperty("IsUTC");
};

/**
 * Sets whether the hardware clock is set to UTC.
 * @param {Object} params
 * @param {boolean} params.isUTC
 * @returns {Promise<void>}
 */
export const setIsUTC = ({ isUTC }) => {
    return setProperty("IsUTC", cockpit.variant("b", isUTC));
};

/**
 * Returns true if NTP is enabled.
 * @returns {Promise<boolean>} Resolves with true if NTP is enabled.
 */
export const getNTPEnabled = () => {
    return getProperty("NTPEnabled");
};

/**
 * Enables or disables NTP service.
 * @param {Object} params
 * @param {boolean} params.enabled
 * @returns {Promise<void>}
 */
export const setNTPEnabled = ({ enabled }) => {
    return setProperty("NTPEnabled", cockpit.variant("b", enabled));
};

/**
 * Gets all configured NTP/time sources.
 * @returns {Promise<Array>} Resolves with an array of time source objects.
 */
export const getTimeSources = () => {
    return getProperty("TimeSources");
};

/**
 * Sets the list of time sources.
 * @param {Object} params
 * @param {Array} params.sources - Array of TimeSourceData tuples
 * @returns {Promise<void>}
 */
export const setTimeSources = ({ sources }) => {
    return setProperty("TimeSources", cockpit.variant("aa{sv}", sources));
};

/**
 * Adds a single custom NTP time source to the list of configured sources.
 * @param {Object} params
 * @param {string} params.hostname - NTP server hostname (e.g. 'ntp.example.com')
 * @param {boolean} [params.isPool] - Whether this is a pool (true) or a single server (false)
 * @returns {Promise<void>}
 */
export const addTimeSource = async ({ hostname, isPool = false, options = [] }) => {
    const existing = await getTimeSources();

    const newSource = {
        hostname: cockpit.variant("s", hostname),
        options: cockpit.variant("as", options),
        type: cockpit.variant("s", isPool ? "POOL" : "NTP"),
    };

    const updatedSources = [...existing, newSource];
    return setTimeSources({ sources: updatedSources });
};

/**
 * Gets NTP servers listed in the chrony configuration file.
 * @returns {Promise<Array>} Resolves with an array of TimeSourceData structures.
 */
export const getTimeServersFromConfig = () => {
    return getProperty("TimeServersFromConfig");
};

/**
 * Starts a geolocation task.
 * @returns {Promise<string>} Resolves with the task object path.
 */
export const startGeolocationWithTask = () => {
    return callClient("StartGeolocationWithTask");
};

/**
 * Gets geolocation result data, if available.
 * @returns {Promise<Object>} Resolves with geolocation result data.
 */
export const getGeolocationResult = () => {
    return getProperty("GeolocationResult");
};

/**
 * Gets the current local date and time as an ISO8601 string.
 * @returns {Promise<string>} Resolves with date/time in ISO8601 format (e.g. '2024-06-05T13:23')
 */
export const getSystemDateTime = () => {
    return callClient("GetSystemDateTime");
};

/**
 * Sets the system date and time using an ISO8601 string.
 * @param {string} dateTimeSpec - Date and time (e.g. '2024-06-05T13:23')
 * @returns {Promise<void>}
 */
export const setSystemDateTime = ({ dateTimeSpec }) => {
    return callClient("SetSystemDateTime", [dateTimeSpec]);
};

/**
 * Checks if the specified NTP server is reachable.
 * @param {string} hostname - The NTP server to check (e.g. 'ntp.example.com')
 * @param {boolean} isNTS - Whether to check for NTS (Network Time Security)
 */
export const checkNTPServer = ({ hostname, isNTS }) => {
    return callClient("CheckNTPServer", [hostname, isNTS]);
};
