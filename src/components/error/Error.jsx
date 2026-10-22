/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import StackTrace from "stacktrace-js";

import React, { cloneElement, useContext } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Form } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { DisconnectedIcon } from "@patternfly/react-icons/dist/esm/icons/disconnected-icon";

import { getBugReportProvider } from "../../helpers/bugReportProviders.js";
import { exitGui } from "../../helpers/exit.js";
import { error } from "../../helpers/log.js";

import { NetworkContext, OsReleaseContext, SystemTypeContext } from "../../contexts/Common.jsx";

import { BZExceptionReportFlow, BZManualReportLink } from "./BugzillaReport.jsx";
import { componentFromException } from "./common.jsx";
import { GenericExceptionReport, GenericManualReportLink } from "./GenericReport.jsx";

import "./Error.scss";

const _ = cockpit.gettext;

/**
 * Content component for bug report modal
 * Dispatches to the appropriate reporting flow based on the bug report provider
 */
const BZReportContent = ({
    buttons,
    exception,
    idPrefix
}) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const isConnected = useContext(NetworkContext).connected;
    const osRelease = useContext(OsReleaseContext);
    const component = componentFromException(exception);
    const provider = getBugReportProvider(osRelease);

    // BZExceptionReportFlow manages its own modal body and footer with step-specific buttons
    if (isConnected && provider.supportsAutomaticReporting && exception) {
        return (
            <BZExceptionReportFlow
              buttons={buttons}
              exception={exception}
              idPrefix={idPrefix}
            />
        );
    }

    let content;
    if (!isConnected) {
        const networkHelperMessageLive = _("Network not available. Configure the network in the top bar menu to report the issue.");
        const networkHelperMessageBootIso = _("Network not available. Configure the network to report the issue.");
        content = (
            <HelperText>
                <HelperTextItem icon={<DisconnectedIcon />}>
                    {isBootIso ? networkHelperMessageBootIso : networkHelperMessageLive}
                </HelperTextItem>
            </HelperText>
        );
    } else if (!provider.supportsAutomaticReporting) {
        if (!exception) {
            content = <GenericManualReportLink />;
        } else {
            content = (
                <GenericExceptionReport
                  exception={exception}
                  idPrefix={idPrefix}
                />
            );
        }
    } else {
        content = <BZManualReportLink component={component} />;
    }

    return (
        <>
            <ModalBody>
                <Form>
                    {content}
                </Form>
            </ModalBody>
            <ModalFooter>{buttons}</ModalFooter>
        </>
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

/** Build exception state from _error and contextData. Copies message/name explicitly (Error props are non-enumerable). */
const buildExceptionState = async (_error, contextData = {}) => {
    const message = _error?.message ?? (typeof _error?.toString === "function" ? _error.toString() : String(_error));
    const name = _error?.name;
    const hasStack = !!_error?.stack;
    if (hasStack) {
        let stack;
        try {
            const arrayStackFrame = await StackTrace.fromError(_error);
            stack = arrayStackFrame.map(frame => frame.toString()).join("\n");
        } catch (parseError) {
            error("StackTrace.fromError failed, using raw stack", parseError);
            stack = _error.stack;
        }
        return {
            frontendException: { contextData, message, name, stack },
            hasError: true
        };
    }
    return {
        backendException: { contextData, message, name },
        hasError: true
    };
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
            const stateUpdate = await buildExceptionState(_error, {});
            error("ErrorBoundary caught an error:", stateUpdate.frontendException ?? stateUpdate.backendException);
            this.setState(stateUpdate);
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
        const { context } = arg || {};

        return async (_error) => {
            if (this.state.hasError) {
                return;
            }
            const stateUpdate = await buildExceptionState(_error, { context });
            error("ErrorBoundary caught an error:", stateUpdate.frontendException ?? stateUpdate.backendException);
            this.setState(stateUpdate);
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
