/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import * as python from "python.js";
import { fmt_to_fragments as fmtToFragments } from "utils";

import React, { useContext, useEffect, useState } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { InputGroup, InputGroupItem } from "@patternfly/react-core/dist/esm/components/InputGroup/index.js";
import { ModalBody, ModalFooter } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { ValidatedOptions } from "@patternfly/react-core/dist/esm/helpers/constants.js";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon";
import { EyeIcon } from "@patternfly/react-icons/dist/esm/icons/eye-icon";
import { EyeSlashIcon } from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon";

import {
    BUGZILLA_BASE_URL,
    buildBugDescription,
    buildBugSummary,
    createBugzillaEnterBug
} from "../../helpers/bugzilla.js";
import { convertToExtlinkIfNeeded } from "../../helpers/extlink.js";
import { debug, error } from "../../helpers/log.js";

import { NetworkContext, OsReleaseContext, SystemTypeContext } from "../../contexts/Common.jsx";

import createBugzillaBug from "../../scripts/create-bugzilla-bug.py";
import searchBugzillaBugs from "../../scripts/search-bugzilla-bugs.py";
import validateBugzillaApiKeyScript from "../../scripts/validate-bugzilla-api-key.py";
import { ExternalLink } from "../common/ExternalLink.jsx";
import { BZReportTabs, componentFromException, ExceptionInfo, useEnvironmentInfo } from "./common.jsx";

const _ = cockpit.gettext;
// When "Restrict access to the report" is checked, the bug is restricted to this group (GTK uses the same default).
const DEFAULT_RESTRICT_GROUP = "fedora_contrib_private";

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

const addExceptionDataToReportURL = (url, exception, bugSummary, bugDescription, environmentInfo) => {
    const newUrl = new URL(url);

    if (bugSummary) {
        newUrl.searchParams.append("short_desc", bugSummary);
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
        REDHAT_BUGZILLA_PRODUCT: product,
        REDHAT_BUGZILLA_PRODUCT_VERSION: version,
    } = useContext(OsReleaseContext);
    const { systemType } = useContext(SystemTypeContext);
    const isBootIso = systemType === "BOOT_ISO";
    const environmentInfo = useEnvironmentInfo();

    const baseUrl = createBugzillaEnterBug({ product, version }, component);

    let href = baseUrl;

    if (exception) {
        const bugSummary = buildBugSummary(exception);
        const initialDescription = buildBugSummary(exception);
        href = addExceptionDataToReportURL(href, exception, bugSummary, initialDescription, environmentInfo);
        href = addLogAttachmentCommentToReportURL(href);
        href = ensureMaximumReportURLLength(href);
    }

    return convertToExtlinkIfNeeded(href, !isBootIso);
};

/**
 * Component for displaying manual Bugzilla reporting link
 * Used when there's no exception (user-initiated feedback)
 */
export const BZManualReportLink = ({ component }) => {
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
    bugzillaApiKey,
    idPrefix,
    onApiKeyChange
}) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const apiKeyUrl = convertToExtlinkIfNeeded(`${BUGZILLA_BASE_URL}/userprefs.cgi?tab=apikey`, !isBootIso);
    const [apiKeyHidden, setApiKeyHidden] = useState(true);

    return (
        <>
            <Content>
                {_("Enter your Bugzilla API key to create a bug report. You will be able to review and edit the bug details in the next step.")}
            </Content>
            <FormGroup
              label={_("Bugzilla API key")}
              isRequired
              fieldId={idPrefix + "-bugzilla-apikey"}
            >
                <InputGroup>
                    <InputGroupItem isFill>
                        <TextInput
                          id={idPrefix + "-bugzilla-apikey"}
                          value={bugzillaApiKey}
                          onChange={(_event, val) => onApiKeyChange(val)}
                          type={apiKeyHidden ? "password" : "text"}
                        />
                    </InputGroupItem>
                    <InputGroupItem>
                        <Button
                          variant="control"
                          onClick={() => setApiKeyHidden(!apiKeyHidden)}
                          aria-label={apiKeyHidden ? _("Show API key") : _("Hide API key")}
                        >
                            {apiKeyHidden ? <EyeIcon /> : <EyeSlashIcon />}
                        </Button>
                    </InputGroupItem>
                </InputGroup>
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
 * Component for displaying potential duplicate bugs found in Bugzilla
 */
const BZDuplicatesList = ({ duplicateBugs, idPrefix, isBootIso }) => {
    return (
        <>
            <Alert
              id={idPrefix + "-duplicates-alert"}
              title={_("Potential duplicate bugs found")}
              variant="info"
              isInline
            >
                <Content>
                    {_("The following open bugs may be related to your issue. Please review them before creating a new report.")}
                </Content>
            </Alert>
            <div
              id={idPrefix + "-duplicates-list"}
              className="bug-report-duplicates-list"
            >
                {duplicateBugs.map(bug => {
                    const bugUrl = convertToExtlinkIfNeeded(bug.url, !isBootIso);
                    return (
                        <div
                          key={bug.id}
                          id={idPrefix + "-duplicate-" + bug.id}
                          className="bug-report-duplicate-item"
                        >
                            <Content component={ContentVariants.p}>
                                <ExternalLink href={bugUrl}>
                                    <strong>#{bug.id}</strong>
                                </ExternalLink>
                                {" "}<span className="bug-report-duplicate-status">[{bug.status}]</span>{" "}
                                {bug.summary}
                            </Content>
                        </div>
                    );
                })}
            </div>
            <Content>
                {_("If your issue matches one of the bugs above, you can open it and add your information there instead of creating a duplicate report.")}
            </Content>
        </>
    );
};

/**
 * Component for bug report details form (step 3)
 */
const BZReportDetailsForm = ({
    bugDescription,
    bugSummary,
    exception,
    idPrefix,
    onDescriptionChange,
    onRestrictAccessChange,
    onSummaryChange,
    restrictAccessToReport
}) => {
    const component = componentFromException(exception);
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const manualReportLinkURL = useBugzillaPrefiledReportURL(component, exception);
    const logFiles = LOG_FILES.map(file => file.replace("/tmp/", ""));
    const restrictAccessLearnMoreURL = `${BUGZILLA_BASE_URL}/userprefs.cgi?tab=permissions`;

    return (
        <>
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
            <div className="pf-v5-u-pt-md">
                <Checkbox
                  id={idPrefix + "-restrict-access"}
                  isChecked={restrictAccessToReport}
                  label={_("Restrict access to the report")}
                  description={fmtToFragments(
                      _("Restricts the report to the $0 group. $1"),
                      <strong>{DEFAULT_RESTRICT_GROUP}</strong>,
                      (
                          <ExternalLink href={convertToExtlinkIfNeeded(restrictAccessLearnMoreURL, !isBootIso)}>
                              {_("Learn more about restricted access in the configuration")}
                          </ExternalLink>
                      )
                  )}
                  onChange={(_event, checked) => onRestrictAccessChange(checked)}
                />
            </div>
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
                    {_("These log files may contain sensitive information such as IP addresses, usernames, or other system details.")}
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
 * Exception report flow component - handles the 3-step flow for exception reporting
 * Step 1: API key entry, Step 2: Duplicate check (skipped if none found), Step 3: Bug details + submit
 */
export const BZExceptionReportFlow = ({
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
    const [reportStep, setReportStep] = useState(1); // 1 = API key entry, 2 = duplicate check, 3 = bug report details
    const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
    const [duplicateBugs, setDuplicateBugs] = useState([]);

    // Note: Summary and description are editable by the user, which is why they're stored in state.
    // The stacktrace and environmentInfo are auto-added to the bug report and are not editable.
    const [bugSummary, setBugSummary] = useState(buildBugSummary(exception));
    const [bugDescription, setBugDescription] = useState(
        buildBugSummary(exception)
    );
    const [restrictAccessToReport, setRestrictAccessToReport] = useState(false);

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

    // Pre-fill bugSummary when exception changes
    useEffect(() => {
        if (exception) {
            const summary = buildBugSummary(exception);
            if (summary) {
                setBugSummary(summary);
                setBugDescription(summary);
            }
        }
    }, [exception]);

    const searchDuplicates = async () => {
        try {
            const searchData = JSON.stringify({
                api_key: bugzillaApiKey,
                component,
                limit: 5,
                product,
                summary: bugSummary,
            });
            const searchProcess = python.spawn(searchBugzillaBugs, [], {
                environ: ["LC_ALL=C.UTF-8"],
                err: "message"
            });
            searchProcess.input(searchData);
            const searchResult = await searchProcess;
            const searchResponse = JSON.parse(searchResult);
            return searchResponse.bugs || [];
        } catch (e) {
            debug("Duplicate search failed, continuing without results:", e.message);
            return [];
        }
    };

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

            const bugs = await searchDuplicates();
            setDuplicateBugs(bugs);

            if (bugs.length > 0) {
                setReportStep(2);
            } else {
                setReportStep(3);
            }
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
            if (restrictAccessToReport) {
                bugData.groups = [DEFAULT_RESTRICT_GROUP];
            }

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

            debug("ANACONDA_BUG_REPORT_ID=" + response.bug_id);

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
                        <BZDuplicatesList
                          duplicateBugs={duplicateBugs}
                          idPrefix={idPrefix}
                          isBootIso={isBootIso}
                        />
                    )}
                    {reportStep === 3 && (
                        <BZReportDetailsForm
                          bugDescription={bugDescription}
                          bugSummary={bugSummary}
                          exception={exception}
                          idPrefix={idPrefix}
                          onDescriptionChange={setBugDescription}
                          onRestrictAccessChange={setRestrictAccessToReport}
                          onSummaryChange={setBugSummary}
                          restrictAccessToReport={restrictAccessToReport}
                        />
                    )}
                </Form>
            </ModalBody>
            <ModalFooter>
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
                          id={idPrefix + "-continue-new-btn"}
                          key="continue-new"
                          variant="primary"
                          onClick={() => setReportStep(3)}
                        >
                            {_("My issue is different, continue")}
                        </Button>
                    </>
                )}
                {reportStep === 3 && (
                    <>
                        <Button
                          key="back"
                          variant="secondary"
                          onClick={() => {
                              if (duplicateBugs.length > 0) {
                                  setReportStep(2);
                              } else {
                                  setReportStep(1);
                              }
                          }}
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
