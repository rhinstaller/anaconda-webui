/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext } from "react";

import { PayloadContext } from "../../contexts/Common.jsx";

/**
 * Installation source completeness for the Review screen.
 *
 * The spoke configures URL repositories only; other source types may still be
 * active from the default backend configuration without visiting the spoke.
 *
 * @param {{ isHidden?: boolean }} [opts]
 * @returns {true | false}
 */
export const usePageComplete = ({ isHidden } = {}) => {
    const { source } = useContext(PayloadContext);

    if (isHidden) {
        return true;
    }

    if (!source?.sourceType) {
        return false;
    }

    switch (source.sourceType) {
    case "CLOSEST_MIRROR":
    case "CDROM":
    case "REPO_PATH":
    case "REPO_FILES":
        return true;

    case "URL":
        return Boolean(source.configuration?.url);

    default:
        return true;
    }
};
