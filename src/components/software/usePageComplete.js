/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext, useEffect, useState } from "react";

import { resolveEnvironment } from "../../apis/payload_dnf.js";

import { PayloadContext } from "../../contexts/Common.jsx";

/**
 * DNF software selection completeness for the Review screen.
 *
 * Mirrors ``is_software_selection_complete`` in Anaconda.
 *
 * @param {{ automatedInstall?: boolean, isHidden?: boolean }} [opts]
 * @returns {true | false | undefined} — **undefined** while ``ResolveEnvironment`` has not
 *   finished; **false** when selection is invalid or resolution failed; **true** when complete.
 */
export const usePageComplete = ({ automatedInstall, isHidden } = {}) => {
    const { packagesKickstarted, selection } = useContext(PayloadContext);
    const environment = selection?.environment ?? "";
    const [environmentResolved, setEnvironmentResolved] = useState(null);

    const kickstarted = automatedInstall && packagesKickstarted;

    useEffect(() => {
        if (isHidden || !environment) {
            setEnvironmentResolved(null);
            return;
        }

        (async () => {
            try {
                const resolved = await resolveEnvironment(environment);
                setEnvironmentResolved(Boolean(resolved));
            } catch {
                setEnvironmentResolved(false);
            }
        })();

        return () => {
            setEnvironmentResolved(null);
        };
    }, [environment, isHidden]);

    if (isHidden) {
        return true;
    }
    if (kickstarted && !environment) {
        return true;
    }
    if (!environment) {
        return false;
    }
    if (environmentResolved === null) {
        return undefined;
    }
    return environmentResolved;
};
