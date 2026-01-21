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

import React, { useContext } from "react";

import { SystemTypeContext } from "../../contexts/Common.jsx";

/**
 * ExternalLink component that handles external links based on system type.
 * In BOOT_ISO mode, links open in a new tab with target="_blank" and rel="noopener noreferrer".
 * In live images, these attributes are omitted since extlink:// protocol handles opening links externally.
 *
 * @param {Object} props - Component props
 * @param {string} props.href - The URL for the link
 * @param {React.ReactNode} props.children - The content of the link
 * @param {Object} props.other - Any other props to pass to the anchor element
 */
export const ExternalLink = ({ children, href, ...other }) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";

    return (
        <a
          href={href}
          {...(isBootIso ? { rel: "noopener noreferrer", target: "_blank" } : {})}
          {...other}
        >
            {children}
        </a>
    );
};
