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

export const StorageErrorList = ({ errorMessages }) => {
    return (
        <>
            <List>
                {errorMessages.map((msg, i) => (
                    <ListItem key={"err-" + i}>{msg}</ListItem>
                ))}
            </List>
            <p>{_("Correct these issues before continuing.")}</p>
        </>
    );
};

/**
 * Inline alert for storage validation (errors take precedence over warnings).
 *
 * @param {Object} validationReport - The validation report from storage validation
 * @param {string} step - The step ID for the notification
 * @returns {Object|null} notification for setStepNotification, or null if valid
 */
export const createStorageValidationNotification = (validationReport, step) => {
    const errorMessages = validationReport?.["error-messages"]?.v || [];
    const warningMessages = validationReport?.["warning-messages"]?.v || [];

    if (errorMessages.length > 0) {
        const errorTitle = cockpit.format(
            cockpit.ngettext("$0 error", "$0 errors", errorMessages.length),
            errorMessages.length
        );
        return {
            message: <StorageErrorList errorMessages={errorMessages} />,
            step,
            title: errorTitle,
            variant: "danger",
        };
    }

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
