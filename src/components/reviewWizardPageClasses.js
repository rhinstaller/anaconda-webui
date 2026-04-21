/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { Page as PageDateAndTime } from "./datetime/index.js";
import { Page as PageInstallationLanguage } from "./localization/index.js";
import { Page as PageSoftwareSelection } from "./software/index.js";
import { Page as PageInstallationMethod } from "./storage/installation-method/index.js";
import { Page as PageAccounts } from "./users/index.js";

/**
 * Wizard Page classes shown on the review screen, in an order that matches the review UI
 * (accounts before installation type and storage).
 * Kept separate from components/index.jsx so the review screen does not import the review
 * Page re-export (which would create a circular module dependency).
 */
export const REVIEW_WIZARD_PAGE_CLASSES = [
    PageInstallationLanguage,
    PageDateAndTime,
    PageSoftwareSelection,
    PageAccounts,
    PageInstallationMethod,
];

/**
 * Same pages as REVIEW_WIZARD_PAGE_CLASSES, grouped to match the review screen layout
 * (system settings vs installation and storage).
 */
export const REVIEW_WIZARD_PAGE_GROUPS = [
    [PageInstallationLanguage, PageDateAndTime, PageSoftwareSelection, PageAccounts],
    [PageInstallationMethod],
];

/**
 * Completion state for each entry in REVIEW_WIZARD_PAGE_CLASSES (same order).
 * Hooks are called explicitly so call order stays valid for the rules of hooks.
 *
 * @param {{ automatedInstall: boolean, hiddenScreens: string[], payloadType?: string }} ctx
 */
export function useReviewWizardPagesCompletion (ctx) {
    return [
        PageInstallationLanguage.useReviewPageComplete(ctx),
        PageDateAndTime.useReviewPageComplete(ctx),
        PageSoftwareSelection.useReviewPageComplete(ctx),
        PageAccounts.useReviewPageComplete(ctx),
        PageInstallationMethod.useReviewPageComplete(ctx),
    ];
}
