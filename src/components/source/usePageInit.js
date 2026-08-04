/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { useContext, useEffect } from "react";

import { getPayloadSourceAction } from "../../actions/payload-source-actions.js";

import { PageContext } from "../../contexts/Common.jsx";

export const useSourcePageInit = () => {
    const { dispatch, setIsFormDisabled } = useContext(PageContext) ?? {};

    useEffect(() => {
        if (!dispatch) {
            setIsFormDisabled?.(false);
            return undefined;
        }

        dispatch(getPayloadSourceAction())
            .finally(() => setIsFormDisabled?.(false));

        return undefined;
    }, [dispatch, setIsFormDisabled]);
};
