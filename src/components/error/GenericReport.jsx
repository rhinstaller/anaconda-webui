/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { fmt_to_fragments as fmtToFragments } from "utils";

import React, { useContext } from "react";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";

import { convertToExtlinkIfNeeded } from "../../helpers/extlink.js";

import { OsReleaseContext, SystemTypeContext } from "../../contexts/Common.jsx";

import { ExternalLink } from "../common/ExternalLink.jsx";
import { BZReportTabs, ExceptionInfo } from "./common.jsx";

const _ = cockpit.gettext;

export const GenericManualReportLink = () => {
    const osRelease = useContext(OsReleaseContext);
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const bugReportURL = osRelease.BUG_REPORT_URL;

    if (!bugReportURL) {
        return (
            <Content>
                {_("Bug reporting is not configured for this distribution.")}
            </Content>
        );
    }

    return (
        <Content>
            {fmtToFragments(
                _("Report an issue or provide feedback at $0."),
                <ExternalLink href={convertToExtlinkIfNeeded(bugReportURL, !isBootIso)}>
                    {bugReportURL}
                </ExternalLink>
            )}
        </Content>
    );
};

export const GenericExceptionReport = ({ exception, idPrefix }) => {
    const osRelease = useContext(OsReleaseContext);
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const bugReportURL = osRelease.BUG_REPORT_URL;

    return (
        <>
            <ExceptionInfo exception={exception} idPrefix={idPrefix} />
            <Divider />
            <BZReportTabs
              exception={exception}
              idPrefix={idPrefix}
              showDescription={false}
            />
            <Divider />
            {bugReportURL
                ? (
                    <Content>
                        {fmtToFragments(
                            _("Please report this issue at $0."),
                            <ExternalLink href={convertToExtlinkIfNeeded(bugReportURL, !isBootIso)}>
                                {bugReportURL}
                            </ExternalLink>
                        )}
                    </Content>
                )
                : (
                    <Content>
                        {_("Bug reporting is not configured for this distribution.")}
                    </Content>
                )}
        </>
    );
};
