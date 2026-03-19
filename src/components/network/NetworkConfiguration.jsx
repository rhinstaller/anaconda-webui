/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useEffect, useState } from "react";

import { useMaybeBackdrop } from "../../hooks/CockpitIntegration.jsx";

import { useNetworkStatus } from "./useNetworkStatus.js";

import "./NetworkConfiguration.scss";

const _ = cockpit.gettext;

export const NetworkConfiguration = ({
    onCritFail,
    setIsFormValid,
}) => {
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const { hasActiveCheckpoint } = useNetworkStatus();
    const backdropClass = useMaybeBackdrop();
    const handleIframeLoad = () => setIsIframeMounted(true);
    const idPrefix = "network-configuration";

    useEffect(() => {
        setIsFormValid(!hasActiveCheckpoint);
    }, [hasActiveCheckpoint, setIsFormValid]);

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("network-configuration-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Network plugin failed") })({ message: exception.error.message, stack: exception.error.stack });
            });
        }
    }, [isIframeMounted, onCritFail]);

    return (
        <div className={backdropClass + " " + idPrefix + "-page-section"}>
            <iframe
              src="/cockpit/@localhost/network/index.html"
              name="network-configuration"
              id="network-configuration-frame"
              onLoad={handleIframeLoad}
              className={idPrefix + "-iframe"} />
        </div>
    );
};
