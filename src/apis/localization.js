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

import { getKeyboardLayoutsAction, getLanguageAction, getLanguagesAction } from "../actions/localization-actions.js";

import { debug } from "../helpers/log.js";
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
        this.client.addEventListener("close", () => console.error("Localization client closed"));

        this.startEventMonitor();

        await this.initData();
    }

    async initData () {
        const language = await this.dispatch(getLanguageAction());
        await this.dispatch(getLanguagesAction());
        if (language) {
            await this.dispatch(getKeyboardLayoutsAction({ language }));
        }
    }

    startEventMonitor () {
        this.client.subscribe(
            { },
            async (path, iface, signal, args) => {
                switch (signal) {
                case "PropertiesChanged":
                    if (args[0] === INTERFACE_NAME && Object.hasOwn(args[1], "Language")) {
                        const language = await this.dispatch(getLanguageAction());
                        if (language) {
                            await this.dispatch(getKeyboardLayoutsAction({ language }));
                        }
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

const normalizeLanguage = (lang) => {
    const parts = lang.split(".")[0].split("_");
    return parts.length > 1 ? parts[1].toLowerCase() : parts[0];
};

/**
 * Sets the system keyboard layout and variant.
 * @param {string} keyboardValue - A string in the format "layoutId:variantId"
 */
export const setKeyboardLayout = async (keyboardValue) => {
    const [layoutId, variantId] = keyboardValue.split(":");

    try {
        const command = ["localectl", "set-x11-keymap", layoutId];
        if (variantId && variantId !== "default") {
            command.push(variantId);
        }

        await cockpit.spawn(command);
    } catch (error) {
        console.error(`Failed to set keyboard layout (${layoutId}, ${variantId}):`, error);
        throw error;
    }
};

/**
 * @param {string} lang         Language id
 * @returns {Promise}           Resolves a list of keyboard layouts for the specified language
 *                              in format {description:, id:}
 */
export const getKeyboardLayoutsForLanguage = async (lang) => {
    const normalizedLang = normalizeLanguage(lang);
    const filePath = "/usr/share/X11/xkb/rules/evdev.lst";

    try {
        const content = await cockpit.file(filePath).read();
        const lines = content.trim().split("\n");

        const layouts = [];
        const layoutMap = new Map();
        let inVariantSection = false;

        // Parse the base layout ids and store them in a map
        for (const line of lines) {
            if (line.startsWith("! layout")) {
                inVariantSection = false;
                continue;
            } else if (line.startsWith("! variant")) {
                inVariantSection = true;
                continue;
            } else if (line.startsWith("! ")) {
                inVariantSection = false;
            }

            if (!inVariantSection) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const layoutId = parts[0];
                    const layoutName = parts.slice(1).join(" ")
                            .trim();
                    layoutMap.set(layoutId, layoutName);
                }
            }
        }

        // Parse the variant section and associate with layout ids
        inVariantSection = false;
        for (const line of lines) {
            if (line.startsWith("! variant")) {
                inVariantSection = true;
                continue;
            } else if (line.startsWith("! ")) {
                inVariantSection = false;
            }

            if (inVariantSection) {
                const parts = line.trim().split(/\s+/);
                if (parts[1] && parts[1].startsWith(`${normalizedLang}:`)) {
                    const variantId = parts[0];
                    const description = parts.slice(1).join(" ")
                            .replace(`${normalizedLang}:`, "")
                            .trim();

                    // Find the base layout id associated with this variant
                    const baseLayoutId = Array.from(layoutMap.keys()).find(layoutId =>
                        parts[1].startsWith(`${normalizedLang}:`) && parts[1].includes(layoutId)
                    );

                    layouts.push({
                        description,
                        layoutId: baseLayoutId || "unknown",
                        variantId,
                    });
                }
            }
        }

        return layouts.length > 0
            ? layouts
            : [{ description: "Default US layout", layoutId: "us", variantId: "us" }];
    } catch (error) {
        console.error(`Failed to process keyboard layouts for language ${lang}:`, error);
        throw error;
    }
};
