/*
 * Copyright (C) 2022 Red Hat, Inc.
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

import { getKeyboardConfigurationAction, getKeyboardLayoutsAction, getLanguageAction, getLanguagesAction } from "../actions/localization-actions.js";

import { debug, error } from "../helpers/log.js";
import { _callClient, _getProperty, _setProperty } from "./helpers.js";

const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Localization";
const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Localization";

const callClient = (...args) => {
    return _callClient(LocalizationClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const setProperty = (...args) => {
    return _setProperty(LocalizationClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};
const getProperty = (...args) => {
    return _getProperty(LocalizationClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export class LocalizationClient {
    constructor (address, dispatch) {
        if (LocalizationClient.instance && (!address || LocalizationClient.instance.address === address)) {
            return LocalizationClient.instance;
        }

        LocalizationClient.instance?.client.close();

        LocalizationClient.instance = this;

        this.client = cockpit.dbus(
            INTERFACE_NAME,
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
        this.dispatch = dispatch;
    }

    async init () {
        this.client.addEventListener("close", () => error("Localization client closed"));

        this.startEventMonitor();

        await this.initData();
    }

    async initData () {
        await this.dispatch(getLanguageAction());
        await this.dispatch(getLanguagesAction());
        await this.dispatch(getKeyboardLayoutsAction());
        await this.dispatch(getKeyboardConfigurationAction());
    }

    startEventMonitor () {
        this.client.subscribe(
            { },
            async (path, iface, signal, args) => {
                switch (signal) {
                case "CompositorSelectedLayoutChanged":
                case "CompositorLayoutsChanged":
                    await this.dispatch(getKeyboardConfigurationAction());
                    break;
                case "PropertiesChanged":
                    if (args[0] === INTERFACE_NAME && Object.hasOwn(args[1], "Language")) {
                        await this.dispatch(getLanguageAction());

                        /* FIXME: On each locale change, KeyboardLayouts must be refetched since they are localized.
                         * Currently, a race condition in the backend) causes the Language property to update,
                         * but the returned KeyboardLayouts still are translated with the previous locale.
                         * Workaround this by dispatching the KeyboardLayouts action with small delay.
                         */
                        setTimeout(async () => {
                            this.dispatch(getKeyboardConfigurationAction());
                            this.dispatch(getKeyboardLayoutsAction());
                        }, 500);
                    } else {
                        debug(`Unhandled signal on ${path}: ${iface}.${signal}`, JSON.stringify(args));
                    }
                    break;
                default:
                    debug(`Unhandled signal on ${path}: ${iface}.${signal}`, JSON.stringify(args));
                }
            });
    }
}

/**
 * @returns {Promise}           Resolves a list of language ids
 */
export const getLanguages = () => {
    return callClient("GetLanguages", []);
};

/**
 * @returns {Promise}           The language the system will use
 */
export const getLanguage = () => {
    return getProperty("Language");
};

/**
 * @param {string} lang         Language id
 *
 * @returns {Promise}           Resolves a language data object
 */
export const getLanguageData = ({ lang }) => {
    return callClient("GetLanguageData", [lang]);
};

/**
 * @param {string} lang         Language id
 *
 * @returns {Promise}           Resolves a list of locales ids
 */
export const getLocales = ({ lang }) => {
    return callClient("GetLocales", [lang]);
};

/**
 * @returns {Promise}           Resolves a list of common locales id's.
 */
export const getCommonLocales = () => {
    return callClient("GetCommonLocales");
};

/**
 * @param {string} lang         Locale id
 *
 * @returns {Promise}           Resolves a locale data object
 */
export const getLocaleData = ({ locale }) => {
    return callClient("GetLocaleData", [locale]);
};

/**
 * @param {string} lang         Language id
 */
export const setLanguage = ({ lang }) => {
    return setProperty("Language", cockpit.variant("s", lang));
};

export const setXLayouts = ({ layouts }) => {
    return setProperty("XLayouts", cockpit.variant("as", layouts));
};

export const setCompositorLayouts = ({ layouts }) => {
    return callClient("SetCompositorLayouts", [layouts, []]);
};

export const getKeyboardConfiguration = async ({ onFail, onSuccess }) => {
    const task = await callClient("GetKeyboardConfigurationWithTask");
    const taskProxy = new LocalizationClient().client.proxy(
        "org.fedoraproject.Anaconda.Task",
        task
    );

    const getTaskResult = async () => {
        const result = await taskProxy.GetResult();
        return onSuccess(result.v);
    };

    const addEventListeners = () => {
        taskProxy.addEventListener("Stopped", async () => {
            try {
                await taskProxy.Finish();
            } catch (error) {
                onFail(error);
            }
        });
        taskProxy.addEventListener("Succeeded", getTaskResult);
    };

    taskProxy.wait(() => {
        addEventListeners();
        (async () => {
            try {
                await taskProxy.Start();
            } catch (error) {
                onFail(error);
            }
        })();
    });
};

/**
 * @returns {Promise}           Resolves a list of locale keyboards
 */
export const getKeyboardLayouts = async () => {
    // FIXME: GetKeyboardLayouts is not available in Fedora 42
    // Remove this try/catch when we stop testing Fedora 42
    try {
        const keyboards = await callClient("GetKeyboardLayouts", []);
        return keyboards;
    } catch (e) {
        if (e.name === "org.freedesktop.DBus.Error.UnknownMethod") {
            return [];
        } else {
            throw e;
        }
    }
};

/**
 * @returns {Promise<string[]>}   Current X keyboard layouts
 */
export const getXLayouts = () => {
    return getProperty("XLayouts");
};

export const setXKeyboardDefaults = async () => {
    // FIXME: Reset XLayouts before calling SetXKeyboardDefaults. Without this reset, the
    // backend would see existing layouts and think they came from
    // kickstart, preventing new defaults from being applied.
    await setXLayouts({ layouts: [] });
    await callClient("SetXKeyboardDefaults");
};
