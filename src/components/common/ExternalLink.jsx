/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
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
