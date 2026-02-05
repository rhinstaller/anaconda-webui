/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

export const setPayloadTypeAction = (type) => {
    return ({
        payload: { type },
        type: "SET_PAYLOAD_TYPE"
    });
};
