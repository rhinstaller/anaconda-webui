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

/** Review description body for the installation source step (incomplete UI is chosen in ReviewConfiguration). */
export const SourceReviewDescription = ({ automatedInstall }) => {
    const { source } = useContext(PayloadContext) ?? {};
    const showKickstartHint = automatedInstall && !isSourceEditable(source);

    return (
        <>
            {hidePasswords(source?.description)}
            {showKickstartHint &&
            <HelperText>
                <HelperTextItem>
                    {_("Set by the kickstart file. Remove source selection from kickstart to be able to configure interactively.")}
                </HelperTextItem>
            </HelperText>}
        </>
    );
};
