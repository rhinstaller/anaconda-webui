/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getCommonLocales,
    getKeyboardConfiguration,
    getKeyboardLayouts,
    getLanguage,
    getLanguageData,
    getLanguages,
    getLocaleData,
    getLocales,
    getXLayouts,
} from "../apis/localization.js";

export const getLanguagesAction = () => {
    return async (dispatch) => {
        const languageIds = await getLanguages();

        return Promise.all([
            dispatch(getCommonLocalesAction()),
            ...languageIds.map(language => dispatch(getLanguageDataAction({ language })))
        ]);
    };
};

export const getLanguageDataAction = ({ language }) => {
    return async (dispatch) => {
        const localeIds = await getLocales({ lang: language });
        const languageData = await getLanguageData({ lang: language });
        const locales = await Promise.all(localeIds.map(async locale => await getLocaleData({ locale })));

        return dispatch({
            payload: { languageData: { [language]: { languageData, locales } } },
            type: "GET_LANGUAGE_DATA"
        });
    };
};

export const getLanguageAction = () => {
    return async (dispatch) => {
        const language = await getLanguage();

        return dispatch({
            payload: { language },
            type: "GET_LANGUAGE"
        });
    };
};

export const getCommonLocalesAction = () => {
    return async (dispatch) => {
        const commonLocales = await getCommonLocales();

        return dispatch({
            payload: { commonLocales },
            type: "GET_COMMON_LOCALES"
        });
    };
};

export const getKeyboardLayoutsAction = () => {
    return async (dispatch) => {
        const keyboardLayouts = await getKeyboardLayouts();

        return dispatch({
            payload: { keyboardLayouts },
            type: "GET_KEYBOARD_LAYOUTS"
        });
    };
};

export const getKeyboardConfigurationAction = () => {
    return async (dispatch) => {
        const xlayouts = await getXLayouts();
        let resultDispatched = false;

        getKeyboardConfiguration({
            onSuccess: (keyboardConfiguration) => {
                // The API triggers the onSuccess callback two times, we want to dispatch only once
                if (resultDispatched) {
                    return;
                }
                resultDispatched = true;

                dispatch({
                    payload: {
                        plannedVconsole: keyboardConfiguration[1],
                        plannedXlayouts: keyboardConfiguration[0],
                        xlayouts,
                    },
                    type: "GET_PLANNED_KEYBOARD_CONFIGURATION"
                });
            }
        });
    };
};
