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

import { useContext, useEffect, useState } from "react";

import { loadBrandingCSS } from "../helpers/branding.js";

import { OsReleaseContext } from "../contexts/Common.jsx";

/**
 * BrandingLoader component that dynamically loads the appropriate branding
 * based on the operating system.
 */
export const BrandingLoader = ({ children }) => {
    const [brandingLoaded, setBrandingLoaded] = useState(false);
    const osRelease = useContext(OsReleaseContext);

    useEffect(() => {
        const loadBranding = async () => {
            // Get the branding name based on OS release
            const brandingName = osRelease?.ID;

            // Add branding class to body for CSS targeting
            if (brandingName) {
                document.documentElement.classList.add(`branding-${brandingName}`);
            }

            // Dynamically load the branding CSS
            await loadBrandingCSS(brandingName);

            setBrandingLoaded(true);
        };

        // Only load branding once we have OS release info
        loadBranding();
    }, [osRelease]);

    // Don't render children until branding is loaded
    if (!brandingLoaded) {
        return null;
    }

    return children;
};

export default BrandingLoader;
