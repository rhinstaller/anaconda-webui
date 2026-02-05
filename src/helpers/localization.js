/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

/**
 * Find a keyboard layout by its layout ID
 * @param {Array} keyboardLayouts - Array of keyboard layout objects
 * @param {string} layoutId - The layout ID to search for
 * @returns {Object|undefined} The matching keyboard layout object or undefined
 */
export const getLocaleById = (keyboardLayouts, layoutId) => {
    return keyboardLayouts.find(layout => layout["layout-id"].v === layoutId);
};
