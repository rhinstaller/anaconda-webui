/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { isSourceEditable } from "../../helpers/source.js";

import { InstallationSource } from "./InstallationSource.jsx";
import { SourceReviewDescription } from "./SourceReviewDescription.jsx";
import { useSourcePageInit } from "./usePageInit.js";

const _ = cockpit.gettext;

export { SourceReviewDescription };

export class Page {
    _description = "Configure the installation source for package downloads.";

    constructor ({ payloadSource, payloadType }) {
        this.component = InstallationSource;
        this.id = "anaconda-screen-installation-source";
        this.isHidden = payloadType !== "DNF" || !isSourceEditable(payloadSource);
        this.label = _("Installation source");
        this.title = _("Installation source");
        this.usePageInit = useSourcePageInit;
    }
}
