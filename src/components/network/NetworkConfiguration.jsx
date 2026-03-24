/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext, useEffect, useState } from "react";

import { PageContext } from "../../contexts/Common.jsx";

import { useMaybeBackdrop } from "../../hooks/CockpitIntegration.jsx";

import { useNetworkStatus } from "./useNetworkStatus.js";

import "./NetworkConfiguration.scss";

const _ = cockpit.gettext;

export const NetworkConfiguration = ({
    onCritFail,
}) => {
    const { setIsFormDisabled, setIsFormValid } = useContext(PageContext) ?? {};
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const { hasActiveCheckpoint } = useNetworkStatus();
    const backdropClass = useMaybeBackdrop();
    const handleIframeLoad = () => setIsIframeMounted(true);
    const idPrefix = "network-configuration";

    const hasModal = backdropClass !== "";
    const isBlocked = hasActiveCheckpoint || hasModal;

    useEffect(() => {
        setIsFormValid(!isBlocked);
        setIsFormDisabled(isBlocked);
    }, [isBlocked, setIsFormDisabled, setIsFormValid]);

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("network-configuration-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Network plugin failed") })({ message: exception.error.message, stack: exception.error.stack });
            });

            // Hide elements not needed in the installer context
            const hideSelectors = ["#networking-graphs", ".cockpit-log-panel"];
            const iframeDoc = iframe.contentDocument;
            const observer = new MutationObserver(() => {
                hideSelectors.forEach(sel => {
                    const el = iframeDoc.querySelector(sel);
                    if (el && el.style.display !== "none") {
                        el.style.display = "none";
                    }
                });
            });
            observer.observe(iframeDoc.body, { childList: true, subtree: true });

            return () => observer.disconnect();
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
