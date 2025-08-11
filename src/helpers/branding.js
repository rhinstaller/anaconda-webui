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
 * Dynamically loads the appropriate branding CSS
 * @param {string|null} brandingName - The branding name to load, or null for no custom branding
 * @returns {Promise} Promise that resolves when the CSS is loaded
 */
export const loadBrandingCSS = async (brandingName) => {
    // If no branding is specified, use PatternFly defaults (no additional CSS needed)
    if (!brandingName) {
        return;
    }

    // Dynamically import the built-in branding SCSS file
    await import("../branding/default.scss");
    await import(`../branding/${brandingName}.scss`);
};
