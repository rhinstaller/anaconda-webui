/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import {
    createSource,
    setPayloadSources,
    setSourceConfiguration,
    setUpSources,
    setUpdatesEnabled,
    tearDownSources,
} from "../../apis/payload_source.js";

import { refreshPayloadSoftwareSelectionAction } from "../../actions/payload-dnf-actions.js";
import { getPayloadSourceAction, setSourceApplyPendingAction } from "../../actions/payload-source-actions.js";

import { PageContext, PayloadContext } from "../../contexts/Common.jsx";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";

import "./InstallationSource.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-installation-source";

const PROTOCOL_HTTP = "http";
const PROTOCOL_HTTPS = "https";
const PROTOCOL_CLOSEST_MIRROR = "closest-mirror";

const PROTOCOLS = [
    { label: _("Closest mirror"), value: PROTOCOL_CLOSEST_MIRROR },
    { label: "http://", value: PROTOCOL_HTTP },
    { label: "https://", value: PROTOCOL_HTTPS },
];

const URL_TYPES = [
    { label: _("Repository URL"), value: "BASEURL" },
    { label: _("Mirrorlist"), value: "MIRRORLIST" },
    { label: _("Metalink"), value: "METALINK" },
];

const isClosestMirrorProtocol = (protocol) => protocol === PROTOCOL_CLOSEST_MIRROR;

const parseHttpUrl = (fullUrl) => {
    if (!fullUrl) {
        return { path: "", protocol: PROTOCOL_HTTPS };
    }
    for (const proto of [PROTOCOL_HTTP, PROTOCOL_HTTPS]) {
        const prefix = proto + "://";
        if (fullUrl.startsWith(prefix)) {
            return { path: fullUrl.substring(prefix.length), protocol: proto };
        }
    }
    return { path: fullUrl, protocol: PROTOCOL_HTTPS };
};

const buildHttpUrl = (protocol, path) => {
    if (!path) {
        return "";
    }
    let clean = path;
    for (const proto of [PROTOCOL_HTTP, PROTOCOL_HTTPS]) {
        const prefix = proto + "://";
        if (clean.startsWith(prefix)) {
            clean = clean.substring(prefix.length);
            break;
        }
    }
    return `${protocol}://${clean}`;
};

const uiStateFromSource = (source) => {
    if (source?.sourceType === "CLOSEST_MIRROR") {
        return {
            protocol: PROTOCOL_CLOSEST_MIRROR,
            url: "",
            urlType: "BASEURL",
        };
    }

    if (source?.sourceType === "URL" && source.configuration?.url) {
        const parsed = parseHttpUrl(source.configuration.url);
        return {
            protocol: parsed.protocol,
            url: parsed.path,
            urlType: source.configuration.type || "BASEURL",
        };
    }

    return {
        protocol: PROTOCOL_CLOSEST_MIRROR,
        url: "",
        urlType: "BASEURL",
    };
};

const buildDesiredSource = ({ protocol, url, urlType }) => {
    if (isClosestMirrorProtocol(protocol)) {
        return {
            config: {
                updatesEnabled: true,
            },
            sourceType: "CLOSEST_MIRROR",
        };
    }

    return {
        config: {
            repoConfig: {
                "ssl-verification-enabled": true,
                type: urlType,
                url: buildHttpUrl(protocol, url.trim()),
            },
        },
        sourceType: "URL",
    };
};

const InstallationSourceFooter = ({ applyCurrentSource, needsApply }) => {
    const { setIsFormDisabled } = useContext(PageContext) ?? {};
    const [isLoading, setIsLoading] = useState(false);

    const onNext = async ({ goToNextStep }) => {
        if (!needsApply) {
            goToNextStep();
            return;
        }

        setIsLoading(true);
        setIsFormDisabled?.(true);
        try {
            await applyCurrentSource();
            goToNextStep();
        } catch {
            // Step notification is shown by applyCurrentSource.
        } finally {
            setIsLoading(false);
            setIsFormDisabled?.(false);
        }
    };

    return (
        <AnacondaWizardFooter
          isLoading={isLoading}
          onNext={onNext}
          spinnerAriaValueText={_("Setting up installation source")}
        />
    );
};

export const InstallationSource = ({ dispatch }) => {
    const { isFormDisabled, setIsFormValid, setStepNotification } = useContext(PageContext) ?? {};
    const { source, sourceApplyPending } = useContext(PayloadContext);

    const [protocol, setProtocol] = useState(PROTOCOL_CLOSEST_MIRROR);
    const [url, setUrl] = useState("");
    const [urlType, setUrlType] = useState("BASEURL");
    const [initialUiState, setInitialUiState] = useState(null);

    const [initialized, setInitialized] = useState(false);
    const applyingRef = useRef(false);

    const isClosestMirror = isClosestMirrorProtocol(protocol);

    const handleProtocolChange = useCallback((_ev, val) => {
        setProtocol(val);
        if (isClosestMirrorProtocol(val)) {
            setUrl("");
            setUrlType("BASEURL");
        }
    }, []);

    useEffect(() => {
        if (!source || initialized) {
            return;
        }

        const nextUiState = uiStateFromSource(source);
        setProtocol(nextUiState.protocol);
        setUrl(nextUiState.url);
        setUrlType(nextUiState.urlType);
        setInitialUiState(nextUiState);
        setInitialized(true);
    }, [source, initialized]);

    useEffect(() => {
        if (!setIsFormValid) {
            return;
        }
        if (!initialized) {
            setIsFormValid(false);
            return;
        }
        setIsFormValid(isClosestMirror || url.trim().length > 0);
    }, [initialized, isClosestMirror, setIsFormValid, url]);

    const applySource = useCallback(async (desired) => {
        if (applyingRef.current) {
            return;
        }

        applyingRef.current = true;
        setStepNotification?.(null);
        try {
            await tearDownSources();

            const sourcePath = await createSource(desired.sourceType);
            if (desired.sourceType === "URL") {
                await setSourceConfiguration(sourcePath, desired.config.repoConfig);
            } else {
                await setUpdatesEnabled(sourcePath, desired.config.updatesEnabled);
            }

            await setPayloadSources([sourcePath]);
            await setUpSources();
            await dispatch(getPayloadSourceAction());
            await dispatch(refreshPayloadSoftwareSelectionAction());
            dispatch(setSourceApplyPendingAction(false));
        } catch (e) {
            dispatch(setSourceApplyPendingAction(true));
            setStepNotification?.({
                message: e.message || String(e),
                step: SCREEN_ID,
                title: _("Failed to configure installation source"),
            });
            throw e;
        } finally {
            applyingRef.current = false;
        }
    }, [dispatch, setStepNotification]);

    const uiState = useMemo(() => ({
        protocol,
        url,
        urlType,
    }), [protocol, url, urlType]);

    const isDirty = useMemo(() => {
        if (!initialUiState) {
            return false;
        }
        return (
            uiState.protocol !== initialUiState.protocol ||
            uiState.url !== initialUiState.url ||
            uiState.urlType !== initialUiState.urlType
        );
    }, [initialUiState, uiState]);

    const needsApply = isDirty || sourceApplyPending;

    const applyCurrentSource = useCallback(async () => {
        if (!needsApply) {
            return;
        }

        const desired = buildDesiredSource(uiState);
        await applySource(desired);
        setInitialUiState(uiState);
    }, [applySource, needsApply, uiState]);

    const footer = useMemo(
        () => (
            <InstallationSourceFooter
              applyCurrentSource={applyCurrentSource}
              needsApply={needsApply}
            />
        ),
        [applyCurrentSource, needsApply]
    );
    useWizardFooter(footer);

    return (
        <Form id={SCREEN_ID}>
            <FormGroup
              fieldId={SCREEN_ID + "-url"}
              label={_("URL")}
            >
                <div className="source-url-row">
                    <FormSelect
                      className="source-protocol-select"
                      id={SCREEN_ID + "-protocol"}
                      isDisabled={isFormDisabled}
                      onChange={handleProtocolChange}
                      value={protocol}
                    >
                        {PROTOCOLS.map(p => (
                            <FormSelectOption
                              key={p.value}
                              label={p.label}
                              value={p.value}
                            />
                        ))}
                    </FormSelect>
                    <TextInput
                      className="source-url-input"
                      id={SCREEN_ID + "-url"}
                      isDisabled={isFormDisabled || isClosestMirror}
                      onChange={(_ev, val) => setUrl(val)}
                      placeholder={isClosestMirror ? _("Closest public mirror") : ""}
                      value={url}
                    />
                </div>
            </FormGroup>
            <FormGroup
              fieldId={SCREEN_ID + "-url-type"}
              label={_("URL type")}
            >
                <div className="source-field-select">
                    <FormSelect
                      id={SCREEN_ID + "-url-type"}
                      isDisabled={isFormDisabled || isClosestMirror}
                      onChange={(_ev, val) => setUrlType(val)}
                      value={urlType}
                    >
                        {URL_TYPES.map(t => (
                            <FormSelectOption
                              key={t.value}
                              label={t.label}
                              value={t.value}
                            />
                        ))}
                    </FormSelect>
                </div>
            </FormGroup>
        </Form>
    );
};
