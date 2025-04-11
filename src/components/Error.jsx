/*
 * Copyright (C) 2023 Red Hat, Inc.
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

import React, { cloneElement, useContext, useEffect, useState } from "react";
import {
    ActionList,
    Button,
    Form,
    FormGroup,
    FormHelperText,
    HelperText,
    HelperTextItem,
    Modal,
    ModalVariant,
    Stack,
    StackItem,
    Text,
    TextArea,
    TextContent,
    TextVariants,
} from "@patternfly/react-core";
import { DisconnectedIcon, ExternalLinkAltIcon } from "@patternfly/react-icons";

import { exitGui } from "../helpers/exit.js";

import { SystemTypeContext } from "../contexts/Common.jsx";

import "./Error.scss";

const _ = cockpit.gettext;

export const bugzillaPrefiledReportURL = (productQueryData, isBootIso) => {
    const baseURL = "https://bugzilla.redhat.com";
    const queryData = {
        ...productQueryData,
        component: "anaconda",
    };

    const reportURL = new URL(baseURL);
    reportURL.pathname = "enter_bug.cgi";
    Object.keys(queryData).map(query => reportURL.searchParams.append(query, queryData[query]));
    if (isBootIso) {
        return reportURL.href;
    } else {
        return reportURL.href.replace("https", "extlink");
    }
};

const ensureMaximumReportURLLength = (reportURL) => {
    const newUrl = new URL(reportURL);
    // The current limit on URL length is 8KiB server limit.
    const searchParamsLimits = [
        // Summary should be short
        { length: 256, param: "short_desc" },
        // We reserve some space in Details text for attachment message which
        // will be always appended to the end.
        { length: 8192 - 256 - 100, param: "comment" },
    ];
    const sp = newUrl.searchParams;
    searchParamsLimits.forEach((limit) => {
        if (sp.get(limit.param)?.length > limit.length) {
            sp.set(limit.param, sp.get(limit.param).slice(0, limit.length));
        }
    });
    return newUrl.href;
};

const addLogAttachmentCommentToReportURL = (reportURL, logFile) => {
    const newUrl = new URL(reportURL);
    const comment = newUrl.searchParams.get("comment") || "";
    newUrl.searchParams.set("comment", comment +
        "\n\n" + cockpit.format(_("Please attach the log file $0 to the issue."), logFile));
    return newUrl.href;
};

export const BZReportModal = ({
    buttons,
    description,
    detailsContent,
    detailsLabel,
    idPrefix,
    isConnected,
    logFile,
    reportLinkURL,
    title,
    titleIconVariant
}) => {
    const [logContent, setLogContent] = useState();
    const [preparingReport, setPreparingReport] = useState(false);
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    useEffect(() => {
        cockpit.spawn(["journalctl", "-a"])
                .then(content => setLogContent(content));
    }, []);

    const openBZIssue = (reportURL, logFile, logContent) => {
        reportURL = ensureMaximumReportURLLength(reportURL);
        reportURL = addLogAttachmentCommentToReportURL(reportURL, logFile);
        setPreparingReport(true);

        const openPage = (
            isBootIso
                ? () => window.open(reportURL)
                : () => window.location.replace(reportURL, "_blank", "noopener,noreferer")
        );

        cockpit
                .file(logFile)
                .replace(logContent)
                .always(() => setPreparingReport(false))
                .then(openPage);
    };

    const networkHelperMessageLive = _("Network not available. Configure the network in the top bar menu to report the issue.");
    const networkHelperMessageBootIso = _("Network not available. Configure the network to report the issue.");

    return (
        <Modal
          description={description}
          id={idPrefix + "-bz-report-modal"}
          isOpen
          position="top"
          showClose={false}
          title={title}
          titleIconVariant={titleIconVariant}
          variant={ModalVariant.large}
          footer={
              <Stack hasGutter>
                  <FormHelperText>
                      <HelperText>
                          {isConnected
                              ? <HelperTextItem> {_("Reporting an issue will send information over the network. Please review and edit the attached log to remove any sensitive information.")} </HelperTextItem>
                              : <HelperTextItem icon={<DisconnectedIcon />}> {isBootIso ? networkHelperMessageBootIso : networkHelperMessageLive} </HelperTextItem>}
                      </HelperText>
                  </FormHelperText>
                  <StackItem>
                      <ActionList>
                          <Button
                            variant="primary"
                            isLoading={preparingReport}
                            isDisabled={logContent === undefined || preparingReport || !isConnected}
                            icon={<ExternalLinkAltIcon />}
                            onClick={() => { openBZIssue(reportLinkURL, logFile, logContent); return false }}
                            component="a">
                              {preparingReport ? _("Preparing report") : _("Report issue")}
                          </Button>
                          {buttons}
                      </ActionList>
                  </StackItem>
              </Stack>
          }>
            <Form>
                {detailsLabel &&
                <FormGroup
                  fieldId={idPrefix + "-bz-report-modal-details"}
                  label={detailsLabel}
                >
                    {detailsContent}
                </FormGroup>}
                <FormGroup
                  fieldId={idPrefix + "-bz-report-modal-review-log"}
                  label={_("Log")}
                >
                    <TextArea
                      value={logContent}
                      onChange={(_, value) => setLogContent(value)}
                      resizeOrientation="vertical"
                      id={idPrefix + "-bz-report-modal-review-log"}
                      isDisabled={logContent === undefined || preparingReport}
                      rows={25}
                    />
                </FormGroup>
            </Form>
        </Modal>
    );
};

const addExceptionDataToReportURL = (url, exception) => {
    const newUrl = new URL(url);
    const backendMessage = exception.backendException?.message || "";
    const frontendMessage = exception.frontendException?.message || "";
    const bothSeparator = exception.backendException?.message && exception.frontendException?.message ? "\n" : "";
    const context = exception.contextData?.context ? exception.contextData.context + " " : "";
    const name = exception.backendException?.name ? exception.backendException.name + ": " : "";
    const stackTrace = exception.frontendException?.stack ? "\n\nStackTrace: " + exception.frontendException.stack : "";
    newUrl.searchParams.append(
        "short_desc",
        "WebUI: " + context + name + backendMessage + frontendMessage
    );
    newUrl.searchParams.append(
        "comment",
        "Installer WebUI Critical Error:\n" + context + name + backendMessage + bothSeparator + frontendMessage + stackTrace
    );
    return newUrl.href;
};

const exceptionInfo = (exception, idPrefix) => {
    const exceptionNamePrefix = exception.backendException?.name ? exception.backendException?.name + ": " : "";
    const backendMessage = exception.backendException?.message ? exception.backendException.message : "";
    const frontendMessage = exception.frontendException?.message ? exception.frontendException.message : "";

    return (
        <TextContent id={idPrefix + "-bz-report-modal-details"}>
            {backendMessage &&
            <Text component={TextVariants.p}>
                {exceptionNamePrefix + backendMessage}
            </Text>}
            {frontendMessage &&
            <Text component={TextVariants.p}>
                {exceptionNamePrefix + frontendMessage}
            </Text>}
        </TextContent>
    );
};

const quitButton = (isBootIso) => {
    return (
        <Button variant="secondary" onClick={exitGui} key="reboot">
            {isBootIso ? _("Reboot") : _("Quit")}
        </Button>
    );
};

const CriticalError = ({ exception, isNetworkConnected, reportLinkURL }) => {
    const isConnected = isNetworkConnected;
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";
    const context = exception.backendException?.contextData?.context || exception.frontendException?.contextData?.context;
    const description = context
        ? cockpit.format(_("The installer cannot continue due to a critical error: $0"), _(context))
        : _("The installer cannot continue due to a critical error.");
    const idPrefix = "critical-error";

    return (
        <BZReportModal
          description={description}
          reportLinkURL={addExceptionDataToReportURL(reportLinkURL, exception)}
          idPrefix={idPrefix}
          title={_("Critical error")}
          titleIconVariant="danger"
          logFile="/tmp/webui.log"
          detailsLabel={_("Error details")}
          detailsContent={exceptionInfo(exception, idPrefix)}
          buttons={[quitButton(isBootIso)]}
          isConnected={isConnected}
        />

    );
};

const cancelButton = (onClose) => {
    return (
        <Button variant="link" onClick={() => onClose()} id="user-issue-dialog-cancel-btn" key="cancel">
            {_("Cancel")}
        </Button>
    );
};

export const UserIssue = ({ isConnected, reportLinkURL, setIsReportIssueOpen }) => {
    return (
        <BZReportModal
          description={_("The following log will be sent to the issue tracking system where you may provide additional details.")}
          reportLinkURL={reportLinkURL}
          idPrefix="user-issue"
          title={_("Report issue")}
          titleIconVariant={null}
          logFile="/tmp/webui.log"
          buttons={[cancelButton(() => setIsReportIssueOpen(false))]}
          isConnected={isConnected}
        />
    );
};

export class ErrorBoundary extends React.Component {
    constructor (props) {
        super(props);
        // Allow providing initial exception to the ErrorBoundary constructor in case of a critical error
        // that happens before the ErrorBoundary is mounted.
        this.state = { backendException: props.backendException, hasError: props.backendException !== undefined };
    }

    // Add window.onerror and window.onunhandledrejection handlers
    componentDidMount () {
        window.onerror = (message, source, lineno, colno, error) => {
            console.error("ErrorBoundary caught an error:", error);
            this.setState({ frontendException: error, hasError: true });
            return true;
        };

        window.onunhandledrejection = (event) => {
            console.error("ErrorBoundary caught an error:", event.reason);
            this.setState({ frontendException: event.reason, hasError: true });
            return true;
        };
    }

    static getDerivedStateFromError (error) {
        if (error) {
            return {
                backendException: error,
                hasError: true
            };
        }
    }

    componentDidCatch (error, info) {
        console.error("ComponentDidCatch: ErrorBoundary caught an error:", error, info);
    }

    onCritFailBackend = (arg) => {
        const { context, isFrontEnd } = arg || {};

        return (error) => {
            console.info("ErrorBoundary caught an error:", error, context);
            if (isFrontEnd) {
                this.setState({ frontendException: { ...error, contextData: { context } }, hasError: true });
            } else {
                this.setState({ backendException: { ...error, contextData: { context } }, hasError: true });
            }
        };
    };

    render () {
        if (this.state.hasError) {
            return (
                <CriticalError
                  exception={this.state}
                  isNetworkConnected={this.props.isNetworkConnected}
                  reportLinkURL={this.props.reportLinkURL}
                />
            );
        }

        return cloneElement(this.props.children, { onCritFail: this.onCritFailBackend });
    }
}
