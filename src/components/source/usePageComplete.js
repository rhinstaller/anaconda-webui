/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext } from "react";

import { PayloadContext } from "../../contexts/Common.jsx";

/**
 * Installation source completeness for the Review screen.
 *
 * The spoke is only shown for sources it can configure, and it does not allow
 * incomplete configurations. Sources provided by kickstart are complete as well,
 * the spoke is hidden for them.
 *
 * @param {{ isHidden?: boolean }} [opts]
 * @returns {true | false}
 */
export const usePageComplete = ({ isHidden } = {}) => {
    const { source } = useContext(PayloadContext);

    if (isHidden) {
        return true;
    }

    return Boolean(source?.sourceType);
};
