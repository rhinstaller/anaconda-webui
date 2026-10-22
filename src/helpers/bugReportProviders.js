/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

const BUGZILLA_REDHAT_URL = "https://bugzilla.redhat.com/";

const normalizeTrailingSlash = (url) => url?.replace(/\/?$/, "/");

const providers = [
    {
        id: "bugzilla-redhat",
        match: (osRelease) => normalizeTrailingSlash(osRelease.BUG_REPORT_URL) === BUGZILLA_REDHAT_URL,
        supportsAutomaticReporting: true,
    },
];

export const getBugReportProvider = (osRelease) => {
    return providers.find(p => p.match(osRelease)) || { id: "generic", supportsAutomaticReporting: false };
};
