/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React from "react";

import { StorageReview, StorageReviewNote } from "../StorageReview.jsx";

export const StorageInstallationReviewSummary = () => (
    <>
        <StorageReview isReviewScreen />
        <StorageReviewNote />
    </>
);
