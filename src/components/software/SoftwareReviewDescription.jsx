/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { useContext, useMemo } from "react";

import { PayloadContext } from "../../contexts/Common.jsx";

/** Review description body for the software selection step (incomplete UI is chosen in ReviewConfiguration). */
export const SoftwareReviewDescription = () => {
    const { environments, selection } = useContext(PayloadContext) ?? {};

    return useMemo(() => {
        const envId = selection?.environment;
        if (!envId) {
            return "";
        }
        const env = environments?.find(e => e.id === envId);
        return env?.name || envId;
    }, [environments, selection?.environment]);
};
