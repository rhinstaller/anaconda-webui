/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext } from "react";

import { LanguageContext } from "../../contexts/Common.jsx";

/**
  * @param {{ isHidden?: boolean }} [opts] - When the welcome spoke is not in the wizard, skip validation.
  */
export const usePageComplete = ({ isHidden } = {}) => {
    const {
        keyboardLayouts,
        language,
        plannedVconsole,
        plannedXlayouts,
    } = useContext(LanguageContext);

    if (isHidden) {
        return true;
    }

    const languageOk = language !== "";
    const keyboardOk =
        keyboardLayouts.length === 0 ||
        ((plannedVconsole ?? "") !== "" && (plannedXlayouts?.length > 0));
    return languageOk && keyboardOk;
};
