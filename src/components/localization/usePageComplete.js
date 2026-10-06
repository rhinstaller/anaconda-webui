/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext } from "react";

import { LanguageContext } from "../../contexts/Common.jsx";

/**
 * @param {{ automatedInstall?: boolean, isHidden?: boolean }} [opts]
 * When **isHidden**, the welcome spoke is not in the wizard — treat as complete.
 * Otherwise: language must be set and keyboard valid; under automated install,
 * false if the lang was not configured from kickstart and the user has
 * not set a language in the UI yet.
 */
export const usePageComplete = ({ automatedInstall, isHidden } = {}) => {
    const {
        keyboardLayouts,
        language,
        languageKickstarted,
        plannedVconsole,
        plannedXlayouts,
        userConfigured,
    } = useContext(LanguageContext);

    if (isHidden) {
        return true;
    }

    if (automatedInstall && !languageKickstarted && !userConfigured) {
        return false;
    }

    const languageOk = language !== "";
    const keyboardOk =
        keyboardLayouts.length === 0 ||
        ((plannedVconsole ?? "") !== "" && (plannedXlayouts?.length > 0));
    return languageOk && keyboardOk;
};
