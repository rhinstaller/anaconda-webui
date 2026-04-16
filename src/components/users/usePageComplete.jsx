/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext } from "react";

import { UsersContext } from "../../contexts/Common.jsx";

/**
 * @param {{ isHidden?: boolean }} [opts] - When the accounts spoke is not in the wizard, skip validation.
 *
 * Otherwise: true when at least one user is defined, or when root is enabled with a root password set.
 */
export const usePageComplete = ({ isHidden } = {}) => {
    const accounts = useContext(UsersContext);

    if (isHidden) {
        return true;
    }
    const hasUser = (accounts?.users?.length ?? 0) > 0;

    const rootDefined =
        accounts?.isRootEnabled === true &&
        accounts?.isRootPasswordSet === true;

    return hasUser || rootDefined;
};
