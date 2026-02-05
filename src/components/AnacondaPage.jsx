/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { cloneElement, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Title } from "@patternfly/react-core/dist/esm/components/Title/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import { error } from "../helpers/log.js";

import { OsReleaseContext } from "../contexts/Common.jsx";

const _ = cockpit.gettext;

export const AnacondaPage = ({
    children,
    isFirstScreen,
    isFormDisabled,
    setIsFormDisabled,
    showStorage,
    step,
    title,
    usePageInit,
}) => {
    const [stepNotification, setStepNotification] = useState();
    const [showPage, setShowPage] = useState(!isFormDisabled);
    const showPageRef = useRef(showPage);

    // If there is usePageInit custom hook for the page, call it
    usePageInit?.();

    // Otherwise just set the form to enabled so that the user can interact with it
    useEffect(() => {
        if (!usePageInit) {
            setIsFormDisabled(false);
        }
    }, [setIsFormDisabled, usePageInit]);

    useEffect(() => {
        if (!stepNotification?.message) {
            return;
        }

        error(stepNotification?.step, stepNotification?.title, stepNotification?.message);
    }, [stepNotification?.step, stepNotification?.message, stepNotification?.title]);

    useEffect(() => {
        if (!isFormDisabled && !showPageRef.current) {
            showPageRef.current = true;
            setShowPage(true);
        }
    }, [isFormDisabled]);

    // Don't try to render anything while cockpit storage mode is active
    // as background API calls might cause UnknownDeviceError
    if (!showPage || showStorage) {
        return null;
    }

    const titleElem = isFirstScreen ? <InitialPageTitle /> : title;

    return (
        <Stack hasGutter>
            {titleElem && <Title headingLevel="h2">{titleElem}</Title>}
            {stepNotification?.step === step &&
                <Alert
                  id={step + "-step-notification"}
                  isInline
                  title={stepNotification.title || stepNotification.message}
                  variant={stepNotification.variant || "danger"}
                  actionLinks={stepNotification.actionLinks}
                >
                    {stepNotification.title && stepNotification.message}
                </Alert>}
            {cloneElement(children, { idPrefix: step, setStepNotification })}
        </Stack>
    );
};

const InitialPageTitle = () => {
    const osRelease = useContext(OsReleaseContext);

    return cockpit.format(_("Welcome. Let's install $0 now."), osRelease.NAME);
};
