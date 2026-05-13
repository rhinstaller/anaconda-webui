/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext, useEffect, useLayoutEffect, useRef } from "react";

import { PageContext } from "../../contexts/Common.jsx";

import { useMaybeBackdrop } from "../../hooks/CockpitIntegration.jsx";

import { useNetworkStatus } from "./useNetworkStatus.js";

import "./NetworkConfiguration.scss";

const _ = cockpit.gettext;

const COCKPIT_NETWORK_IFRAME_SRC = "/cockpit/@localhost/network/index.html";

/**
 * Cockpit network page embedded in an iframe. Sets `cockpit_anaconda` in sessionStorage
 * before paint so Cockpit’s `in_anaconda_mode()` applies when the iframe loads.
 */
export const CockpitNetworkIframe = ({
    className,
    iframeId,
    iframeName,
    onCritFail,
}) => {
    const iframeRef = useRef(null);

    useLayoutEffect(() => {
        /* Cockpit `in_anaconda_mode()` only checks that JSON parses; content unused for network */
        window.sessionStorage.setItem("cockpit_anaconda", "{}");
    }, []);

    useEffect(() => {
        const el = iframeRef.current;
        if (!el) {
            return undefined;
        }

        let removeErrorListener = () => {};

        const attach = () => {
            removeErrorListener();
            const win = el.contentWindow;
            if (!win) {
                return;
            }
            const handler = exception => {
                onCritFail({ context: _("Network plugin failed") })({
                    message: exception.error.message,
                    stack: exception.error.stack,
                });
            };
            win.addEventListener("error", handler);
            removeErrorListener = () => win.removeEventListener("error", handler);
        };

        el.addEventListener("load", attach);
        attach();

        return () => {
            el.removeEventListener("load", attach);
            removeErrorListener();
        };
    }, [onCritFail]);

    return (
        <iframe
          ref={iframeRef}
          src={COCKPIT_NETWORK_IFRAME_SRC}
          name={iframeName}
          id={iframeId}
          className={className} />
    );
};

export const NetworkConfiguration = ({
    onCritFail,
}) => {
    const { setIsFormDisabled, setIsFormValid } = useContext(PageContext) ?? {};
    const { hasActiveCheckpoint } = useNetworkStatus();
    const backdropClass = useMaybeBackdrop();
    const idPrefix = "network-configuration";

    const hasModal = backdropClass !== "";
    const isBlocked = hasActiveCheckpoint || hasModal;

    useEffect(() => {
        setIsFormValid(!isBlocked);
        setIsFormDisabled(isBlocked);
    }, [isBlocked, setIsFormDisabled, setIsFormValid]);

    return (
        <div className={backdropClass + " " + idPrefix + "-page-section"}>
            <CockpitNetworkIframe
              iframeId={idPrefix + "-frame"}
              iframeName="network-configuration"
              className={idPrefix + "-iframe"}
              onCritFail={onCritFail} />
        </div>
    );
};
