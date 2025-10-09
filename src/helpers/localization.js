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

/**
 * Find a keyboard layout by its layout ID
 * @param {Array} keyboardLayouts - Array of keyboard layout objects
 * @param {string} layoutId - The layout ID to search for
 * @returns {Object|undefined} The matching keyboard layout object or undefined
 */
export const getLocaleById = (keyboardLayouts, layoutId) => {
    return keyboardLayouts.find(layout => layout["layout-id"].v === layoutId);
};
