/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React from "react";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List/index.js";

const _ = cockpit.gettext;

/**
 * Component that displays storage validation warnings with instructions.
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.warningMessages - Array of warning messages to display
 */
export const StorageWarningList = ({ warningMessages }) => {
    return (
        <>
            <List>
                {warningMessages.map((msg, i) => (
                    <ListItem key={"warn-" + i}>{msg}</ListItem>
                ))}
            </List>
            <p>{_("Click 'Next' again to proceed despite these warnings.")}</p>
        </>
    );
};

/**
 * Create a step notification object for storage validation warnings.
 *
 * @param {Object} validationReport - The validation report from storage validation
 * @param {string} step - The step ID for the notification
 * @returns {Object|null} - Notification object with title and message, or null if no warnings
 */
export const createWarningNotification = (validationReport, step) => {
    const warningMessages = validationReport?.["warning-messages"]?.v || [];

    if (warningMessages.length === 0) {
        return null;
    }

    const warningTitle = cockpit.format(
        cockpit.ngettext("$0 warning", "$0 warnings", warningMessages.length),
        warningMessages.length
    );

    return {
        message: <StorageWarningList warningMessages={warningMessages} />,
        step,
        title: warningTitle,
        variant: "warning",
    };
};
