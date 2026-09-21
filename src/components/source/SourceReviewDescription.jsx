/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext } from "react";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";

import { hidePasswords, isSourceEditable } from "../../helpers/source.js";

import { PayloadContext } from "../../contexts/Common.jsx";

const _ = cockpit.gettext;

const truncateMiddle = (str, maxLength = 80) => {
    if (!str || str.length <= maxLength) {
        return str;
    }
    const ellipsis = "...";
    const charsToShow = maxLength - ellipsis.length;
    const frontChars = Math.ceil(charsToShow / 2);
    const backChars = Math.floor(charsToShow / 2);
    return str.substring(0, frontChars) + ellipsis + str.substring(str.length - backChars);
};

/** Review description body for the installation source step (incomplete UI is chosen in ReviewConfiguration). */
export const SourceReviewDescription = ({ automatedInstall }) => {
    const { source } = useContext(PayloadContext) ?? {};
    const showKickstartHint = automatedInstall && !isSourceEditable(source);

    let description;
    if (source?.sourceType === "CLOSEST_MIRROR") {
        description = _("Closest mirror");
    } else if (source?.sourceType === "URL") {
        description = hidePasswords(source.configuration?.url || "");
    } else {
        // Fallback for other source types (NFS, HDD, etc. from kickstart)
        description = hidePasswords(source?.description || "");
    }

    return (
        <>
            {description && <span title={description}>{truncateMiddle(description, 100)}</span>}
            {showKickstartHint &&
            <HelperText>
                <HelperTextItem>
                    {_("Set by the kickstart file. Remove source selection from kickstart to be able to configure interactively.")}
                </HelperTextItem>
            </HelperText>}
        </>
    );
};
