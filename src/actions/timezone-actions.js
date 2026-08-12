/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

export const setTimezoneAction = ({ kickstarted, timezone, userConfigured } = {}) => {
    return ({
        payload: { kickstarted, timezone, userConfigured },
        type: "SET_TIMEZONE",
    });
};

export const setAllValidTimezonesAction = ({ allValidTimezones }) => {
    return ({
        payload: { allValidTimezones },
        type: "SET_ALL_VALID_TIMEZONES",
    });
};
