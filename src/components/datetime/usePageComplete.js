/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext } from "react";

import { isValidTimezone } from "../../helpers/timezone.js";

import { TimezoneContext } from "../../contexts/Common.jsx";

/**
 * @param {{ automatedInstall?: boolean, isHidden?: boolean }} [opts]
 * When **isHidden**, the date & time spoke is not in the wizard — treat as complete.
 * Otherwise: timezone must be valid in the catalog; under automated install, false
 * if the timezone module was not configured from kickstart and the user has not
 * set a timezone in the UI yet.
 */
export const usePageComplete = ({ automatedInstall, isHidden } = {}) => {
    const tz = useContext(TimezoneContext);

    if (isHidden) {
        return true;
    }
    const kickstarted = tz?.kickstarted;
    const userConfigured = tz?.userConfigured;
    if (automatedInstall && !kickstarted && !userConfigured) {
        return false;
    }
    return isValidTimezone(tz?.timezone, tz?.allValidTimezones ?? {});
};
