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

import * as python from "python.js";
import StackTrace from "stacktrace-js";
import { fmt_to_fragments as fmtToFragments } from "utils";

import React, { cloneElement, useContext, useEffect, useState } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Tab, Tabs, TabTitleText } from "@patternfly/react-core/dist/esm/components/Tabs/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { ValidatedOptions } from "@patternfly/react-core/dist/esm/helpers/constants.js";
import { DisconnectedIcon } from "@patternfly/react-icons/dist/esm/icons/disconnected-icon";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon";

import {
    BUGZILLA_BASE_URL,
    buildBugDescription,
    buildBugSummary,
    convertToExtlinkIfNeeded,
    createBugzillaEnterBug
} from "../helpers/bugzilla.js";
import { exitGui } from "../helpers/exit.js";
import { error } from "../helpers/log.js";

import { AppVersionContext, NetworkContext, OsReleaseContext, SystemTypeContext } from "../contexts/Common.jsx";

import createBugzillaBug from "../scripts/create-bugzilla-bug.py";
import validateBugzillaApiKeyScript from "../scripts/validate-bugzilla-api-key.py";
import { ExternalLink } from "./common/ExternalLink.jsx";

import "./Error.scss";

const _ = cockpit.gettext;
const JOURNAL_LOG = "/tmp/journal.log";
const ANACONDA_LOG = "/tmp/anaconda.log";
const STORAGE_LOG = "/tmp/storage.log";
const PROGRAM_LOG = "/tmp/program.log";
const PACKAGING_LOG = "/tmp/packaging.log";
const WEBUI_LOG = "/tmp/anaconda-webui.log";

const LOG_FILES = [
    JOURNAL_LOG,
    ANACONDA_LOG,
    STORAGE_LOG,
    PROGRAM_LOG,
    PACKAGING_LOG,
    WEBUI_LOG
];

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

const addExceptionDataToReportURL = (url, exception, bugSummary, bugDescription, environmentInfo) => {
    const newUrl = new URL(url);

    if (bugSummary) {
        // Add "WebUI: " prefix for URL format (matching original behavior)
        newUrl.searchParams.append("short_desc", "WebUI: " + bugSummary);
    }

    const stacktrace = exception?.frontendException?.stack;
    const description = buildBugDescription({ bugDescription, environmentInfo, stacktrace });
    if (description) {
        newUrl.searchParams.append("comment", description);
    }

    return newUrl.href;
};

const useBugzillaPrefiledReportURL = (component, exception) => {
    const {
        PRETTY_NAME: prettyName,
        REDHAT_BUGZILLA_PRODUCT: product,
        REDHAT_BUGZILLA_PRODUCT_VERSION: version,
    } = useContext(OsReleaseContext);
    const { systemType } = useContext(SystemTypeContext);
    const appVersion = useContext(AppVersionContext);
    const isBootIso = systemType === "BOOT_ISO";
    const environmentInfo = useEnvironmentInfo();

    const baseUrl = createBugzillaEnterBug({ product, version }, component);

    let href = baseUrl;

    if (exception) {
        const bugSummary = buildBugSummary(exception);
        const initialDescription = buildBugSummary(exception);
        href = addExceptionDataToReportURL(href, exception, bugSummary, initialDescription, environmentInfo);
        const debugInfoArray = [
            ["OS", prettyName],
            ["Anaconda version", appVersion.backend],
            ["Anaconda UI version", appVersion.webui],
        ];
        href = addDebugInfoToReportURL(href, debugInfoArray);
        href = addLogAttachmentCommentToReportURL(href);
        href = ensureMaximumReportURLLength(href);
    }

    return convertToExtlinkIfNeeded(href, !isBootIso);
};

const useEnvironmentInfo = () => {
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
 * Component for displaying manual Bugzilla reporting link
 * Used when there's no exception (user-initiated feedback)
 */
const BZManualReportLink = ({ component }) => {
    const manualReportLinkURL = useBugzillaPrefiledReportURL(component);
    return (
        <Content>
            {fmtToFragments(
                _("Report an issue or provide feedback by opening the Bugzilla bug entry form $0."),
                <ExternalLink href={manualReportLinkURL}>
                    {_("here")}
                </ExternalLink>
            )}
        </Content>
    );
};

/**
 * Component for displaying manual Bugzilla reporting option
 * Used when there's an exception and user prefers manual reporting
 */
const BZManualReportOption = ({ component, exception }) => {
    const manualReportLinkURL = useBugzillaPrefiledReportURL(component, exception);

    return (
        <Content>
            {fmtToFragments(
                _("Prefer to report manually? $0"),
                <ExternalLink href={manualReportLinkURL}>
                    {_("Open Bugzilla bug entry form")}
                </ExternalLink>
            )}
        </Content>
    );
};

/**
 * Component for API key entry form (step 1)
 */
const BZAPIKeyEntryForm = ({
    bugCreationError,
    bugzillaApiKey,
    idPrefix,
    onApiKeyChange
}) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const apiKeyUrl = convertToExtlinkIfNeeded(`${BUGZILLA_BASE_URL}/userprefs.cgi?tab=apikey`, !isBootIso);

    return (
        <>
            <Content>
                {_("Enter your Bugzilla API key to create a bug report. You will be able to review and edit the bug details in the next step.")}
            </Content>
            {bugCreationError && (
                <Alert
                  title={bugCreationError}
                  variant="danger"
                  isInline />
            )}
            <FormGroup
              label={_("Bugzilla API key")}
              isRequired
              fieldId={idPrefix + "-bugzilla-apikey"}
            >
                <TextInput
                  id={idPrefix + "-bugzilla-apikey"}
                  value={bugzillaApiKey}
                  onChange={(_event, val) => onApiKeyChange(val)}
                  type="password"
                />
                <HelperText>
                    <HelperTextItem>
                        {fmtToFragments(
                            _("You can generate the API key for your Bugzilla account $0."),
                            (
                                <ExternalLink href={apiKeyUrl}>
                                    {_("here")}
                                </ExternalLink>
                            )
                        )}
                    </HelperTextItem>
                </HelperText>
            </FormGroup>
        </>
    );
};

/**
 * Component for bug report tabs (Description, Stacktrace, Environment)
 */
const BZReportTabs = ({
    bugDescription,
    exception,
    idPrefix,
    onDescriptionChange
}) => {
    const environmentInfo = useEnvironmentInfo();
    const frontendStackTrace = exception?.frontendException?.stack;
    return (
        <Tabs
          defaultActiveKey={0}
          id={idPrefix + "-bug-tabs"}
        >
            <Tab eventKey={0} title={<TabTitleText>{_("Description")}</TabTitleText>}>
                <TextArea
                  id={idPrefix + "-bug-description"}
                  value={bugDescription}
                  onChange={(_event, val) => onDescriptionChange(val)}
                  placeholder={_("Detailed description of the issue")}
                  resizeOrientation="vertical"
                  rows={8}
                />
            </Tab>
            {frontendStackTrace && (
                <Tab eventKey={1} title={<TabTitleText>{_("Stacktrace")}</TabTitleText>}>
                    <Content component="pre" className="bug-report-code-block bug-report-code-block-scrollable">
                        {frontendStackTrace}
                    </Content>
                </Tab>
            )}
            <Tab eventKey={frontendStackTrace ? 2 : 1} title={<TabTitleText>{_("Environment")}</TabTitleText>}>
                <Content component="pre" className="bug-report-code-block">
                    {environmentInfo}
                </Content>
            </Tab>
        </Tabs>
    );
};

/**
 * Component for bug report details form (step 2)
 */
const BZReportDetailsForm = ({
    bugCreationError,
    bugDescription,
    bugSummary,
    exception,
    idPrefix,
    onDescriptionChange,
    onSummaryChange
}) => {
    const component = componentFromException(exception);
    const manualReportLinkURL = useBugzillaPrefiledReportURL(component, exception);
    const logFiles = LOG_FILES.map(file => file.replace("/tmp/", ""));

    return (
        <>
            {bugCreationError && (
                <Alert
                  title={_("Failed to report issue")}
                  variant="danger"
                  isInline>
                    <Content>
                        {bugCreationError}
                    </Content>
                </Alert>
            )}
            <Content component={ContentVariants.h4} className={idPrefix + "-bz-report-modal-intructions-header"}>
                {_("Bug report details")}
            </Content>
            <FormGroup
              label={_("Title")}
              isRequired
              fieldId={idPrefix + "-bug-summary"}
            >
                <TextInput
                  id={idPrefix + "-bug-summary"}
                  value={bugSummary}
                  onChange={(_event, val) => onSummaryChange(val)}
                  placeholder={_("Brief description of the issue")}
                  validated={!bugSummary.trim() ? ValidatedOptions.error : ValidatedOptions.default}
                />
            </FormGroup>
            <BZReportTabs
              bugDescription={bugDescription}
              exception={exception}
              idPrefix={idPrefix}
              onDescriptionChange={onDescriptionChange}
            />
            <Divider />
            <Alert
              title={_("Automatic log file upload")}
              variant="warning"
              isInline
            >
                <Content>
                    {fmtToFragments(
                        _("When you submit this bug report, the following log files will be uploaded automatically: $0"),
                        <strong>{logFiles.join(", ")}</strong>
                    )}
                </Content>
                <Content>
                    {_("These log files may contain sensitive information such as IP addresses, usernames, or other system details. Attachments on Bugzilla issues are marked private by default.")}
                </Content>
                <Content>
                    {fmtToFragments(
                        _("If you do not consent to automatic log file upload, you can $0 instead. Manual reporting allows you to review and selectively attach log files yourself."),
                        <ExternalLink href={manualReportLinkURL}>
                            {_("report the issue manually")}
                        </ExternalLink>
                    )}
                </Content>
            </Alert>
        </>
    );
};

/**
 * Helper function to get component name from exception
 */
const componentFromException = (exception) => {
    const hasFrontendException = !!exception?.frontendException;
    return exception ? (hasFrontendException ? "anaconda-webui" : "anaconda") : "anaconda";
};

/**
 * Exception report flow component - handles the 2-step for exception reporting
 */
const BZExceptionReportFlow = ({
    buttons,
    exception,
    idPrefix
}) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const isConnected = useContext(NetworkContext).connected;
    const component = componentFromException(exception);
    const {
        REDHAT_BUGZILLA_PRODUCT: product,
        REDHAT_BUGZILLA_PRODUCT_VERSION: version,
    } = useContext(OsReleaseContext);
    const environmentInfo = useEnvironmentInfo();

    const [isCreatingBug, setIsCreatingBug] = useState(false);
    const [bugCreationError, setBugCreationError] = useState(null);
    const [bugzillaApiKey, setBugzillaApiKey] = useState("");
    const [reportStep, setReportStep] = useState(1); // 1 = API key entry, 2 = bug report details
    const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);

    // Note: Summary and description are editable by the user, which is why they're stored in state.
    // The stacktrace and environmentInfo are auto-added to the bug report and are not editable.
    const [bugSummary, setBugSummary] = useState(buildBugSummary(exception));
    const [bugDescription, setBugDescription] = useState(
        buildBugSummary(exception)
    );

    useEffect(() => {
        // Let's make sure we have the latest logs from journal saved to /tmp/journal.log
        // Let's not confuse users with syslog
        // See https://issues.redhat.com/browse/INSTALLER-4210
        cockpit.spawn(["journalctl", "-a"])
                .then((output) => (
                    cockpit.file(JOURNAL_LOG)
                            .replace(output)
                ));
    }, []);

    // Ensure bugSummary is set when exception changes (only if not already set by user)
    useEffect(() => {
        if (exception) {
            const summary = buildBugSummary(exception);
            // Only update if summary is non-empty and current summary is empty (preserve user edits)
            if (summary && !bugSummary) {
                setBugSummary(summary);
                setBugDescription(summary);
            }
        }
    }, [exception, bugSummary]);

    const handleNext = async () => {
        setBugCreationError(null);
        setIsValidatingApiKey(true);

        try {
            const inputData = JSON.stringify({ api_key: bugzillaApiKey });
            const process = python.spawn(validateBugzillaApiKeyScript, [], {
                environ: ["LC_ALL=C.UTF-8"],
                err: "message"
            });
            process.input(inputData);
            await process;
            setReportStep(2);
        } catch (e) {
            setBugCreationError(e.message);
        } finally {
            setIsValidatingApiKey(false);
        }
    };

    const createBug = async () => {
        setIsCreatingBug(true);
        setBugCreationError(null);

        try {
            // Build complete description using helper function
            const stacktrace = exception?.frontendException?.stack;
            const description = buildBugDescription({
                bugDescription,
                environmentInfo,
                stacktrace,
            });

            const bugData = {
                api_key: bugzillaApiKey,
                component,
                description,
                log_files: LOG_FILES,
                product,
                summary: bugSummary,
                version,
            };

            const inputJson = JSON.stringify(bugData);
            let result;
            try {
                const process = python.spawn(createBugzillaBug, [], {
                    environ: ["LC_ALL=C.UTF-8"],
                    err: "message"
                });
                process.input(inputJson);
                result = await process;
            } catch (e) {
                setBugCreationError(e.message);
                setIsCreatingBug(false);
                return;
            }

            const response = JSON.parse(result);

            // Success! Open the created bug
            const bugUrl = response.url;
            const extlinkUrl = convertToExtlinkIfNeeded(bugUrl, !isBootIso);

            window.open(extlinkUrl);
            setIsCreatingBug(false);
        } catch (e) {
            // Show error to user
            const errorMessage = e.message || String(e);
            error("Failed to report issue:", errorMessage);
            setBugCreationError(errorMessage);
            setIsCreatingBug(false);
        }
    };

    return (
        <>
            <ModalBody>
                <Form>
                    {reportStep === 1 && (
                        <>
                            <ExceptionInfo exception={exception} idPrefix={idPrefix} />
                            <Divider />
                            <BZAPIKeyEntryForm
                              bugCreationError={bugCreationError}
                              bugzillaApiKey={bugzillaApiKey}
                              idPrefix={idPrefix}
                              onApiKeyChange={setBugzillaApiKey}
                            />
                            <Divider />
                            <BZManualReportOption
                              component={component}
                              exception={exception}
                              bugSummary={bugSummary}
                              bugDescription={bugDescription}
                            />
                        </>
                    )}
                    {reportStep === 2 && (
                        <BZReportDetailsForm
                          bugCreationError={bugCreationError}
                          bugDescription={bugDescription}
                          bugSummary={bugSummary}
                          exception={exception}
                          idPrefix={idPrefix}
                          onDescriptionChange={setBugDescription}
                          onSummaryChange={setBugSummary}
                        />
                    )}
                </Form>
            </ModalBody>
            <ModalFooter>
                {reportStep === 1 && (
                    <Button
                      key="next"
                      variant="primary"
                      isDisabled={!isConnected || !bugzillaApiKey?.trim() || isValidatingApiKey}
                      isLoading={isValidatingApiKey}
                      onClick={handleNext}
                    >
                        {isValidatingApiKey ? _("Validating...") : _("Next")}
                    </Button>
                )}
                {reportStep === 2 && (
                    <>
                        <Button
                          key="back"
                          variant="secondary"
                          onClick={() => setReportStep(1)}
                        >
                            {_("Back")}
                        </Button>
                        <Button
                          key="create-bug"
                          variant="primary"
                          isDisabled={!isConnected || isCreatingBug || !bugSummary?.trim()}
                          isLoading={isCreatingBug}
                          icon={<ExternalLinkAltIcon />}
                          onClick={() => { createBug(); return false }}
                        >
                            {isCreatingBug ? _("Reporting issue...") : _("Report issue")}
                        </Button>
                    </>
                )}
                {buttons}
            </ModalFooter>
        </>
    );
};

/**
 * Content component for Bugzilla report modal
 * Handles mode selection (network state, user flow, exception flow)
 */
const BZReportContent = ({
    buttons,
    exception,
    idPrefix
}) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const isConnected = useContext(NetworkContext).connected;
    const component = componentFromException(exception);

    const networkHelperMessageLive = _("Network not available. Configure the network in the top bar menu to report the issue.");
    const networkHelperMessageBootIso = _("Network not available. Configure the network to report the issue.");

    if (!isConnected) {
        return (
            <>
                <ModalBody>
                    <HelperText>
                        <HelperTextItem icon={<DisconnectedIcon />}>
                            {isBootIso ? networkHelperMessageBootIso : networkHelperMessageLive}
                        </HelperTextItem>
                    </HelperText>
                </ModalBody>
                <ModalFooter>{buttons}</ModalFooter>
            </>
        );
    }

    if (!exception) {
        return (
            <>
                <ModalBody>
                    <Form>
                        <BZManualReportLink component={component} />
                    </Form>
                </ModalBody>
                <ModalFooter>{buttons}</ModalFooter>
            </>
        );
    }

    return (
        <BZExceptionReportFlow
          buttons={buttons}
          exception={exception}
          idPrefix={idPrefix}
        />
    );
};

export const BZReportModal = ({
    buttons,
    exception,
    idPrefix,
    title,
    titleIconVariant
}) => {
    const context = exception?.backendException?.contextData?.context || exception?.frontendException?.contextData?.context;
    const description = exception
        ? (
            context
                ? cockpit.format(_("The installer cannot continue due to a critical error: $0"), _(context))
                : _("The installer cannot continue due to a critical error.")
        )
        : undefined;

    const header = (
        <ModalHeader
          description={description}
          title={title}
          titleIconVariant={titleIconVariant}
        />
    );

    return (
        <Modal
          id={idPrefix + "-bz-report-modal"}
          isOpen
          position="top"
          variant={ModalVariant.medium}
        >
            {header}
            <BZReportContent
              buttons={buttons}
              exception={exception}
              idPrefix={idPrefix}
            />
        </Modal>
    );
};

/**
 * Component for displaying exception information
 */
const ExceptionInfo = ({ exception, idPrefix }) => {
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

const QuitButton = () => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    return (
        <Button variant="secondary" onClick={exitGui} key="reboot">
            {isBootIso ? _("Reboot") : _("Quit")}
        </Button>
    );
};

const CriticalError = ({ exception }) => {
    const idPrefix = "critical-error";

    return (
        <BZReportModal
          idPrefix={idPrefix}
          title={_("Installation failed")}
          titleIconVariant="danger"
          buttons={[<QuitButton key="quit" />]}
          exception={exception}
        />

    );
};

const CancelButton = ({ onClose }) => {
    return (
        <Button variant="link" onClick={() => onClose()} id="user-issue-dialog-cancel-btn" key="cancel">
            {_("Cancel")}
        </Button>
    );
};

export const UserIssue = ({ setIsReportIssueOpen }) => {
    return (
        <BZReportModal
          idPrefix="user-issue"
          title={_("Report issue")}
          titleIconVariant={null}
          buttons={[<CancelButton key="cancel" onClose={() => setIsReportIssueOpen(false)} />]}
          exception={null}
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
        const errorHandler = async (_error) => {
            error("ErrorBoundary caught an error:", _error);
            const arrayStackFrame = await StackTrace.fromError(_error);
            const stack = arrayStackFrame.map(frame => frame.toString()).join("\n");
            this.setState({
                frontendException: { message: _error.message, stack },
                hasError: true
            });
            return true;
        };
        window.onerror = async (message, source, lineno, colno, _error) => errorHandler(_error);
        window.onunhandledrejection = (event) => errorHandler(event.reason);
    }

    // React Error Boundary: Catches React rendering errors synchronously
    // This prevents errors from propagating and crashing the page before window.onerror fires
    static getDerivedStateFromError () {
        return { hasError: true };
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
