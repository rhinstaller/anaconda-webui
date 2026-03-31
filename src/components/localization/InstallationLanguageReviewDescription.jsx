/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { useContext, useMemo } from "react";

import { LanguageContext } from "../../contexts/Common.jsx";

/** Review description body for the language step (incomplete UI is chosen in ReviewConfiguration). */
export const InstallationLanguageReviewDescription = () => {
    const localizationData = useContext(LanguageContext);

    const language = useMemo(() => {
        for (const l of Object.keys(localizationData.languages)) {
            const locale = localizationData.languages[l].locales.find(
                locale => locale["locale-id"].v === localizationData.language
            );

            if (locale) {
                return locale;
            }
        }
    }, [localizationData]);

    return language ? language["native-name"].v : localizationData.language;
};
