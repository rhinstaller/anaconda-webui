/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

/**
 * Convert an HTTPS URL to extlink:// protocol if needed for non-boot ISO environments
 * @param {String} url - The URL to convert
 * @param {Boolean} useExtlink - Whether to use extlink:// protocol (true for non-boot ISO)
 * @returns {String} - The converted URL
 */
export const convertToExtlinkIfNeeded = (url, useExtlink) => {
    if (useExtlink && url.startsWith("https://")) {
        return url.replace("https://", "extlink://");
    }
    return url;
};
