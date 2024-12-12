/*
 * Copyright (C) 2022 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */
import cockpit from "cockpit";

import React, { cloneElement, useContext, useEffect, useRef, useState } from "react";
import { Alert, Stack, Title } from "@patternfly/react-core";

import { OsReleaseContext } from "../contexts/Common.jsx";

const _ = cockpit.gettext;

export const AnacondaPage = ({
    children,
    isFirstScreen,
    isFormDisabled,
    setIsFormDisabled,
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
        if (!isFormDisabled && !showPageRef.current) {
            showPageRef.current = true;
            setShowPage(true);
        }
    }, [isFormDisabled]);

    if (!showPage) {
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
                  title={stepNotification.message}
                  variant="danger"
                />}
            {cloneElement(children, { idPrefix: step, setStepNotification })}
        </Stack>
    );
};

const InitialPageTitle = () => {
    const osRelease = useContext(OsReleaseContext);

    return cockpit.format(_("Welcome. Let's install $0 now."), osRelease.REDHAT_SUPPORT_PRODUCT);
};
