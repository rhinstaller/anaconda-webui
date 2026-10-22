/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useContext } from "react";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Tab, Tabs, TabTitleText } from "@patternfly/react-core/dist/esm/components/Tabs/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";

import { AppVersionContext, OsReleaseContext } from "../../contexts/Common.jsx";

const _ = cockpit.gettext;

/**
 * Helper function to get component name from exception
 */
export const componentFromException = (exception) => {
    const hasFrontendException = !!exception?.frontendException;
    return exception ? (hasFrontendException ? "anaconda-webui" : "anaconda") : "anaconda";
};

export const useEnvironmentInfo = () => {
    const {
        PRETTY_NAME: prettyName,
    } = useContext(OsReleaseContext);
    const appVersion = useContext(AppVersionContext);
    return [
        "---[ System & Environment Information ]---",
        `OS: ${prettyName}`,
        `Anaconda version: ${appVersion.backend}`,
        `Anaconda UI version: ${appVersion.webui}`
    ].join("\n");
};

/**
 * Component for displaying exception information
 */
export const ExceptionInfo = ({ exception, idPrefix }) => {
    const exceptionNamePrefix = exception.backendException?.name ? exception.backendException?.name + ": " : "";
    const backendMessage = exception.backendException?.message ? exception.backendException.message : "";
    const frontendMessage = exception.frontendException?.message ? exception.frontendException.message : "";

    return (
        <FormGroup
          fieldId={idPrefix + "-bz-report-modal-details"}
          label={_("Error details")}
        >
            <Content id={idPrefix + "-bz-report-modal-details"}>
                {backendMessage &&
                <Content>
                    {exceptionNamePrefix + backendMessage}
                </Content>}
                {frontendMessage &&
                <Content>
                    {exceptionNamePrefix + frontendMessage}
                </Content>}
            </Content>
        </FormGroup>
    );
};

/**
 * Component for bug report tabs (Description, Stacktrace, Environment)
 */
export const BZReportTabs = ({
    bugDescription,
    exception,
    idPrefix,
    onDescriptionChange,
    showDescription = true
}) => {
    const environmentInfo = useEnvironmentInfo();
    const frontendStackTrace = exception?.frontendException?.stack;
    let tabIndex = 0;
    return (
        <Tabs
          defaultActiveKey={0}
          id={idPrefix + "-bug-tabs"}
        >
            {showDescription && (
                <Tab eventKey={tabIndex++} title={<TabTitleText>{_("Description")}</TabTitleText>}>
                    <TextArea
                      id={idPrefix + "-bug-description"}
                      value={bugDescription}
                      onChange={(_event, val) => onDescriptionChange(val)}
                      placeholder={_("Detailed description of the issue")}
                      resizeOrientation="vertical"
                      rows={8}
                    />
                </Tab>
            )}
            {frontendStackTrace && (
                <Tab eventKey={tabIndex++} title={<TabTitleText>{_("Stacktrace")}</TabTitleText>}>
                    <Content component="pre" className="bug-report-code-block bug-report-code-block-scrollable">
                        {frontendStackTrace}
                    </Content>
                </Tab>
            )}
            <Tab eventKey={tabIndex} title={<TabTitleText>{_("Environment")}</TabTitleText>}>
                <Content component="pre" className="bug-report-code-block">
                    {environmentInfo}
                </Content>
            </Tab>
        </Tabs>
    );
};
