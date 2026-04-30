/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { useContext } from "react";

import { TimezoneContext } from "../../contexts/Common.jsx";

/** Configured timezone text for the review screen (completeness is handled on the review page). */
export const DateAndTimeReviewDescription = () => {
    const timezone = useContext(TimezoneContext)?.timezone;
    return timezone;
};
