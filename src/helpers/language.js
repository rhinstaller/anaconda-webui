/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

/*
 * Converts a language locale ID to a string that a Cockpit language cookie expects:
 * The expected format can be found here https://github.com/cockpit-project/cockpit/blob/main/po/language_map.txt
 */
export const convertToCockpitLang = ({ lang }) => {
    return lang.split(".UTF-8")[0].replace(/_/g, "-").toLowerCase();
};

export const getLangCookie = () => {
    return window.localStorage.getItem("cockpit.lang") || "en-us";
};

export const setLangCookie = ({ cockpitLang }) => {
    const cookie = "CockpitLang=" + encodeURIComponent(cockpitLang) + "; path=/; expires=Sun, 16 Jul 3567 06:23:41 GMT";
    document.cookie = cookie;
    window.localStorage.setItem("cockpit.lang", cockpitLang);
};
