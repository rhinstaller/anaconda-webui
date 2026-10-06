/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useScenario } from "./InstallationScenario.jsx";

export const StorageScenarioReviewDescription = () => {
    const { getLabel } = useScenario();
    return getLabel?.({ isReview: true });
};
