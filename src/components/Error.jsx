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

import { fmt_to_fragments as fmtToFragments } from "utils";

import React, { cloneElement, useContext, useEffect } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { DisconnectedIcon } from "@patternfly/react-icons/dist/esm/icons/disconnected-icon";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon";

import { createBugzillaEnterBug } from "../helpers/bugzilla.js";
import { exitGui } from "../helpers/exit.js";
import { error } from "../helpers/log.js";

import { AppVersionContext, NetworkContext, OsReleaseContext, SystemTypeContext } from "../contexts/Common.jsx";

import "./Error.scss";

const _ = cockpit.gettext;
const JOURNAL_LOG = "/tmp/journal.log";
const WEBUI_LOG = "/tmp/anaconda-webui.log";

const useBugzillaPrefiledReportURL = () => {
    const {
        REDHAT_BUGZILLA_PRODUCT: product,
        REDHAT_BUGZILLA_PRODUCT_VERSION: version,
    } = useContext(OsReleaseContext);
    const { systemType } = useContext(SystemTypeContext);
    const isBootIso = systemType === "BOOT_ISO";
    const href = createBugzillaEnterBug({ product, version });

    if (!isBootIso) {
        return href.replace("https", "extlink");
    }
    return href;
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

const addLogAttachmentCommentToReportURL = (reportURL) => {
    const newUrl = new URL(reportURL);
    const logFile = JOURNAL_LOG;
    const comment = newUrl.searchParams.get("comment") || "";
    newUrl.searchParams.set("comment", comment +
        "\n\n" + cockpit.format(_("Please attach the log file $0 to the issue."), logFile));
    return newUrl.href;
};

const addDebugInfoToReportURL = (reportURL, debugInfoArray) => {
    // debugInfoArray MUST be an array of arrays in the format
    // [["label1", "value1"], ["label2", "value2"], ...]
    const newUrl = new URL(reportURL);
    const comment = newUrl.searchParams.get("comment") || "";
    // we don't want to translate this string. It is meant for support engineers / debugging purposes.
    const debugInfo = cockpit.format([
        "---[ System & Environment Information ]---",
        ...debugInfoArray.map((item) => `${item[0]}: ${item[1]}`)
    ].join("\n"));
    newUrl.searchParams.set("comment", comment + "\n\n" + debugInfo + "\n\n");
    return newUrl.href;
};

export const BZReportModal = ({
    buttons,
    description,
    detailsContent,
    detailsLabel,
    idPrefix,
    isFrontendException,
    reportLinkURL,
    title,
    titleIconVariant
}) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const isConnected = useContext(NetworkContext).connected;

    useEffect(() => {
        // Let's make sure we have the latest logs from journal saved to /tmp/journal.log
        // Let's not confuse users with syslog
        // See https://issues.redhat.com/browse/INSTALLER-4210
        (async () => {
            const output = await cockpit.spawn(["journalctl", "-a"]);
            await cockpit.file(JOURNAL_LOG).replace(output);
        })();
    }, []);

    const {
        PRETTY_NAME: prettyName,
    } = useContext(OsReleaseContext);

    const appVersion = useContext(AppVersionContext);

    const debugInfoArray = [
        ["OS", prettyName],
        ["Anaconda version", appVersion.backend],
        ["Anaconda UI version", appVersion.webui],
    ];

    const openBZIssue = (reportURL) => {
        reportURL = addLogAttachmentCommentToReportURL(reportURL);
        reportURL = addDebugInfoToReportURL(reportURL, debugInfoArray);
        // this should be the last modification on reportURL
        reportURL = ensureMaximumReportURLLength(reportURL);

        if (isBootIso) {
            window.open(reportURL);
        } else {
            window.location.replace(reportURL, "_blank", "noopener,noreferer");
        }
    };

    const networkHelperMessageLive = _("Network not available. Configure the network in the top bar menu to report the issue.");
    const networkHelperMessageBootIso = _("Network not available. Configure the network to report the issue.");

    const header = (
        <ModalHeader
          description={description}
          title={title}
          titleIconVariant={titleIconVariant}
        />
    );
    const footer = (
        <ModalFooter>
            <Button
              key="report-issue"
              variant="primary"
              isAriaDisabled={!isConnected}
              icon={<ExternalLinkAltIcon />}
              onClick={() => { openBZIssue(reportLinkURL); return false }}
              component="a">
                {_("Report issue")}
            </Button>
            {buttons}
        </ModalFooter>
    );

    return (
        <Modal
          id={idPrefix + "-bz-report-modal"}
          isOpen
          position="top"
          variant={ModalVariant.small}
        >

            {header}
            <ModalBody>
                <Form>
                    {detailsLabel &&
                    <>
                        <FormGroup
                          fieldId={idPrefix + "-bz-report-modal-details"}
                          label={detailsLabel}
                        >
                            {detailsContent}
                        </FormGroup>
                        <Divider />
                    </>}
                    {isConnected
                        ? (
                            <>
                                {detailsLabel &&
                                <Content component={ContentVariants.h4} className={idPrefix + "-bz-report-modal-intructions-header"}>
                                    {_("Help us fix the issue!")}
                                </Content>}
                                <Content component={ContentVariants.ol}>
                                    <Content component={ContentVariants.li}>
                                        {fmtToFragments(_("Click \"$0\" to open Bugzilla in a new window."), <strong>{_("Report issue")}</strong>)}
                                    </Content>
                                    <Content component={ContentVariants.li}>
                                        {_("Log in to Bugzilla, or create a new account.")}
                                    </Content>
                                    <Content component={ContentVariants.li}>
                                        {!isFrontendException
                                            ? fmtToFragments(_("After creating the issue, click 'Add attachment' and attach file $0."), <i>{JOURNAL_LOG}</i>)
                                            : fmtToFragments(_("After creating the issue, click 'Add attachment' and attach file $0 and $1."), <i>{JOURNAL_LOG}</i>, <i>{WEBUI_LOG}</i>)}
                                    </Content>
                                </Content>
                                <Alert title={_("Logs may contain sensitive information like IP addresses or usernames. Attachments on Bugzilla issues are marked private by default.")} variant="warning" isInline isPlain />
                            </>
                        )
                        : (
                            <HelperText>
                                <HelperTextItem icon={<DisconnectedIcon />}>
                                    {isBootIso ? networkHelperMessageBootIso : networkHelperMessageLive}
                                </HelperTextItem>
                            </HelperText>
                        )}
                </Form>
            </ModalBody>
            {footer}
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
    );
};

const quitButton = (isBootIso) => {
    return (
        <Button variant="secondary" onClick={exitGui} key="reboot">
            {isBootIso ? _("Reboot") : _("Quit")}
        </Button>
    );
};

const CriticalError = ({ exception }) => {
    const reportLinkURL = useBugzillaPrefiledReportURL();
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
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
          isFrontendException={!!exception.frontendException}
          title={_("Installation failed")}
          titleIconVariant="danger"
          detailsLabel={_("Error details")}
          detailsContent={exceptionInfo(exception, idPrefix)}
          buttons={[quitButton(isBootIso)]}
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

export const UserIssue = ({ setIsReportIssueOpen }) => {
    const reportLinkURL = useBugzillaPrefiledReportURL();

    return (
        <BZReportModal
          reportLinkURL={reportLinkURL}
          idPrefix="user-issue"
          title={_("Report issue")}
          titleIconVariant={null}
          buttons={[cancelButton(() => setIsReportIssueOpen(false))]}
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
        window.onerror = (message, source, lineno, colno, _error) => {
            error("ErrorBoundary caught an error:", _error);
            this.setState({ frontendException: _error, hasError: true });
            return true;
        };

        window.onunhandledrejection = (event) => {
            error("ErrorBoundary caught an error:", event.reason);
            this.setState({ frontendException: event.reason, hasError: true });
            return true;
        };
    }

    static getDerivedStateFromError (_error) {
        if (_error) {
            return {
                backendException: _error,
                hasError: true
            };
        }
    }

    componentDidCatch (_error, info) {
        error("ComponentDidCatch: ErrorBoundary caught an error:", _error, info);
    }

    onCritFailBackend = (arg) => {
        const { context, isFrontEnd } = arg || {};

        return (_error) => {
            error("ErrorBoundary caught an error:", _error, context);
            if (isFrontEnd) {
                this.setState({ frontendException: { ..._error, contextData: { context } }, hasError: true });
            } else {
                this.setState({ backendException: { ..._error, contextData: { context } }, hasError: true });
            }
        };
    };

    render () {
        if (this.state.hasError) {
            return (
                <CriticalError
                  exception={this.state}
                />
            );
        }

        return cloneElement(this.props.children, { onCritFail: this.onCritFailBackend });
    }
}
