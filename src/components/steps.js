/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { debug } from "../helpers/log.js";

import { Page as PageDateAndTime } from "./datetime/index.js";
import { Page as PageProgress } from "./installation/index.js";
import { Page as PageInstallationLanguage } from "./localization/index.js";
import { Page as PageNetworkConfiguration } from "./network/index.js";
import { Page as PageReviewConfiguration } from "./review/index.js";
import { Page as PageSoftwareSelection } from "./software/index.js";
import { Page as PageInstallationSource } from "./source/index.js";
import { Page as PageInstallationMethod } from "./storage/installation-method/index.js";
import { Page as PageMountPointMapping } from "./storage/mount-point-mapping/index.js";
import { Page as PageStorageConfiguration } from "./storage/storage-configuration/index.js";
import { Page as PageSubscription } from "./subscription/index.js";
import { Page as PageAccounts } from "./users/index.js";

const _ = cockpit.gettext;

export const getSteps = (automatedInstall, userInterfaceConfig, args) => {
    const mountPointMappingStep = new PageMountPointMapping(args);
    const hiddenScreens = userInterfaceConfig.hidden_webui_pages || [];
    const stepsOrder = [
        new PageInstallationLanguage(args),
        new PageNetworkConfiguration(args),
        new PageSubscription(args),
        new PageDateAndTime(args),
        new PageInstallationSource(args),
        new PageSoftwareSelection(args),
        new PageInstallationMethod(args),
        new PageStorageConfiguration(args),
        {
            id: "anaconda-screen-storage-configuration-manual",
            isHidden: mountPointMappingStep.isHidden,
            label: _("Storage configuration"),
            steps: [mountPointMappingStep],
        },
        new PageAccounts(args),
        new PageReviewConfiguration(args),
        new PageProgress(args),
    ];

    /* Screens can be hidden in two ways:
     * 1. Dynamically: Controlled by the 'Page.isHidden' property in individual components,
     *    e.g., when the required D-Bus module is not available (see 'subscription/index.js').
     * 2. Statically: Configured via the 'hidden_webui_pages' key in the 'anaconda.conf'
     *    For example, the 'Account Creation' screen is hidden in the 'Workstation' ISO
     *    because this step is handled by the 'Gnome Initial Setup' tool during the first boot.
     *
     * Both are folded into 'Page.isHidden', which is the single source of truth
     * for whether a screen is part of the wizard (see 'isStepHidden').
     */
    stepsOrder.forEach(s => {
        if (hiddenScreens.includes(s.id)) {
            debug(
                `Screen '${s.id}' will not be displayed because it is hidden by the Anaconda configuration file.`
            );
            s.isHidden = true;
        }
    });

    const firstScreenId = automatedInstall
        ? "anaconda-screen-review"
        : stepsOrder.find(s => !s.isHidden)?.id;

    return stepsOrder.map(s => {
        s.isFirstScreen = s.id === firstScreenId;
        return s;
    });
};

/**
 * Whether the step with the given id is hidden from the wizard.
 * Steps not present in the list are considered hidden.
 *
 * @param {Array} steps - Steps as returned by 'getSteps'
 * @param {string} id - Step id
 * @returns {boolean}
 */
export const isStepHidden = (steps, id) => {
    for (const s of steps) {
        if (s.id === id) {
            return !!s.isHidden;
        }
        if (s.steps) {
            const sub = s.steps.find(sub => sub.id === id);
            if (sub) {
                return !!(s.isHidden || sub.isHidden);
            }
        }
    }
    return true;
};
