/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React from "react";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import { IncompleteStepIndicator } from "../../review/Common.jsx";
import { StorageReview, StorageReviewNote } from "../../review/StorageReview.jsx";

export const StorageInstallationReviewSummary = ({ complete }) => (
    <>
        <Stack hasGutter>
            <StorageReview isReviewScreen />
            {!complete && <IncompleteStepIndicator />}
        </Stack>
        <StorageReviewNote />
    </>
);
