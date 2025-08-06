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
    await import(`../branding/${brandingName}.scss`);
};

/**
 * Gets the appropriate logo path based on the distribution
 * @param {Object} osRelease - OS release information (from /etc/os-release)
 * @returns {string|null} Path to the logo file
 */
export const getLogoPath = (osRelease) => {
    const idLike = osRelease?.ID_LIKE || osRelease?.ID;

    // Use distribution-specific logo (must be symlinked by Makefile)
    return `./logo-${idLike}.svg`;
};

/**
 * Gets available branding configurations
 * @returns {Object} Object with branding names as keys and display names as values
 */
export const getAvailableBranding = () => {
    return {
        bazzite: "Bazzite",
        default: "PatternFly Defaults",
        fedora: "Fedora",
    };
};
