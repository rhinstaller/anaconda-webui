/*
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Create a Bugzilla URL for entering a bug report
 * @param {Object} - { product, version }
 * @returns {String} - The URL for entering a bug report in Bugzilla
 */
export const createBugzillaEnterBug = (osReleaseData) => {
    const baseURL = "https://bugzilla.redhat.com";
    const queryData = {
        component: "anaconda",
        ...osReleaseData,
    };
    const reportURL = new URL(baseURL);

    reportURL.pathname = "enter_bug.cgi";

    Object.keys(queryData).map(query => reportURL.searchParams.append(query, queryData[query]));

    return reportURL.href;
};
