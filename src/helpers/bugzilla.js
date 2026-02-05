/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

export const BUGZILLA_BASE_URL = "https://bugzilla.redhat.com";

/**
 * Convert an HTTPS URL to extlink:// protocol if needed for non-boot ISO environments
 * @param {String} url - The URL to convert
 * @param {Boolean} useExtlink - Whether to use extlink:// protocol (true for non-boot ISO)
 * @returns {String} - The converted URL
 */
export const convertToExtlinkIfNeeded = (url, useExtlink) => {
    if (useExtlink && url.startsWith("https://")) {
        return url.replace("https://", "extlink://");
    }
    return url;
};

/**
 * Create a Bugzilla URL for entering a bug report
 * @param {Object} osReleaseData - { product, version }
 * @param {String} component - Bugzilla component (defaults to "anaconda")
 * @returns {String} - The URL for entering a bug report in Bugzilla
 */
export const createBugzillaEnterBug = (osReleaseData, component = "anaconda") => {
    const queryData = {
        component,
        ...osReleaseData,
    };
    const reportURL = new URL(BUGZILLA_BASE_URL);

    reportURL.pathname = "enter_bug.cgi";

    Object.keys(queryData).map(query => reportURL.searchParams.append(query, queryData[query]));

    return reportURL.href;
};

/**
 * Build bug summary from exception
 * @param {Object} exception - Exception object with backendException and/or frontendException
 * @returns {String} - The bug summary
 */
export const buildBugSummary = (exception) => {
    if (!exception) {
        return "";
    }
    const context = exception.backendException?.contextData?.context || exception.frontendException?.contextData?.context || "";
    const contextPrefix = context ? context + " " : "";
    const backendMessage = exception.backendException?.message || "";
    const frontendMessage = exception.frontendException?.message || "";
    const name = (exception.backendException?.name || exception.frontendException?.name)
        ? (exception.backendException?.name || exception.frontendException?.name) + ": "
        : "";
    return contextPrefix + name + backendMessage + frontendMessage;
};

/**
 * Build bug description from initial description, stacktrace, and environment info
 * @param {Object} params - { initialDescription, stacktrace, environmentInfo }
 * @returns {String} - The complete bug description
 */
export const buildBugDescription = ({ environmentInfo, initialDescription, stacktrace }) => {
    const sections = [];

    if (initialDescription?.trim()) {
        sections.push(initialDescription.trim());
    }

    if (stacktrace) {
        sections.push(`---[ Frontend Stacktrace ]---\n${stacktrace}`);
    }

    if (environmentInfo) {
        sections.push(environmentInfo);
    }

    return sections.join("\n\n");
};
