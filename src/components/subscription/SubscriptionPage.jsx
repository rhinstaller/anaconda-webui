/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useEffect, useState } from "react";
import { PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";

import "./SubscriptionPage.scss";

const _ = cockpit.gettext;


export const SubscriptionPage = ({
    onCritFail, setIsFormValid
}) => {
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const handleIframeLoad = () => setIsIframeMounted(true);
    const idPrefix = "cockpit-subscription-page";
    // for now, let's have the page enabled no matter what
    // (setIsFormValid allows navigating to next page)
    setIsFormValid(true);

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("cockpit-subscription-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Subscription plugin failed") })({ message: exception.error.message, stack: exception.error.stack });
            });
        }
    }, [isIframeMounted, onCritFail]);

    return (
        <div className={idPrefix + "-page-section-cockpit-subscription"} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <PageSection hasBodyWrapper={false} style={{ flex: 1, overflow: "hidden" } }>
                <iframe
                  src="/cockpit/@localhost/subscriptions/index.html"
                  name="cockpit-subscription"
                  id="cockpit-subscription-frame"
                  onLoad={handleIframeLoad}
                  title={_("Subscription management")}
                  className={idPrefix + "-iframe-cockpit-subscription"} />
            </PageSection>
        </div>
    );
};
