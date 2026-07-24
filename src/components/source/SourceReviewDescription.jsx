/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";
import { useContext } from "react";

import { PayloadContext } from "../../contexts/Common.jsx";

const _ = cockpit.gettext;

/** Review description body for the installation source step (incomplete UI is chosen in ReviewConfiguration). */
export const SourceReviewDescription = () => {
    const { source } = useContext(PayloadContext) ?? {};

    switch (source?.sourceType) {
    case "CLOSEST_MIRROR":
        return _("Closest mirror");
    case "URL":
        return source?.configuration?.url || "";
    default:
        return source?.sourceType || "";
    }
};
