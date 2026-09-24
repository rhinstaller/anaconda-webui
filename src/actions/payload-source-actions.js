/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import {
    getPayloadSources,
    getSourceConfiguration,
    getSourceDescription,
    getSourceType,
    getUpdatesEnabled,
} from "../apis/payload_source.js";

export const getPayloadSourceAction = () => {
    return async (dispatch) => {
        const sources = await getPayloadSources();

        if (!sources || sources.length === 0) {
            return dispatch({
                payload: { configuration: null, description: "", sourcePath: null, sourceType: null, updatesEnabled: true },
                type: "SET_PAYLOAD_SOURCE",
            });
        }

        const sourcePath = sources[0];
        const sourceType = await getSourceType(sourcePath);

        const sourceData = {
            configuration: null,
            description: await getSourceDescription(sourcePath),
            sourcePath,
            sourceType,
            updatesEnabled: true,
        };

        if (sourceType === "URL") {
            sourceData.configuration = await getSourceConfiguration(sourcePath);
        }

        if (sourceType === "CLOSEST_MIRROR") {
            sourceData.updatesEnabled = await getUpdatesEnabled(sourcePath);
        }

        return dispatch({
            payload: sourceData,
            type: "SET_PAYLOAD_SOURCE",
        });
    };
};

export const setSourceApplyPendingAction = (pending) => {
    return {
        payload: { pending },
        type: "SET_SOURCE_APPLY_PENDING",
    };
};
