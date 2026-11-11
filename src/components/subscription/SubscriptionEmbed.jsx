/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import subscriptionsClient from "subscription-manager-cockpit/src/subscriptions-client.js";
import SubscriptionsView from "subscription-manager-cockpit/src/subscriptions-view.jsx";

import React, { useContext, useEffect } from "react";

import { PageContext } from "../../contexts/Common.jsx";

let clientInitialized = false;

const _ = cockpit.gettext;

/** Review step summary for Subscription status */
export const SubscriptionReviewDescription = () => {
    if (clientInitialized) {
        const isRegistered = (subscriptionsClient.subscriptionStatus.status !== "unknown");
        if (isRegistered) {
            return _("Registered");
        } else {
            return _("Not registered");
        }
    }
    return null;
};

export const SubscriptionEmbed = () => {
    const { setIsFormValid } = useContext(PageContext);

    useEffect(() => {
        setIsFormValid(true);
    }, [setIsFormValid]);

    useEffect(() => {
        if (!clientInitialized) {
            subscriptionsClient.init();
            clientInitialized = true;
        }
    }, []);

    return <SubscriptionsView />;
};
