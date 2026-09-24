/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

const EDITABLE_URL_PREFIXES = ["http://", "https://"];

/**
 * Whether the installation source spoke can represent the active source.
 *
 * Sources which the spoke can not express (NFS, hard drive, FTP, local media, ...)
 * come from a kickstart file or a boot option. They are only shown in the Review
 * screen, so that the spoke can not silently drop parts of their configuration.
 *
 * @param {Object|null|undefined} source - The 'payload.source' store substate
 * @returns {boolean}
 */
export const isSourceEditable = (source) => {
    if (source?.sourceType === "CLOSEST_MIRROR") {
        return true;
    }

    if (source?.sourceType !== "URL") {
        return false;
    }

    const url = source.configuration?.url;

    return EDITABLE_URL_PREFIXES.some(prefix => url?.startsWith(prefix));
};

/**
 * Mask the password of URLs with credentials, e.g. a proxy or an FTP source.
 *
 * The user name is kept and the password is replaced by a fixed mask, so that it
 * is clear that a password is configured without showing it or its length.
 *
 * @param {string|null|undefined} text - A URL or a text containing one
 * @returns {string}
 */
export const hidePasswords = (text) => {
    return (text || "").replace(/:\/\/([^/@\s:]+):[^/@\s]*@/g, "://$1:****@");
};
