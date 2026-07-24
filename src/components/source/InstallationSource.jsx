/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import {
    createSource,
    setPayloadSources,
    setSourceConfiguration,
    setUpSources,
    setUpdatesEnabled,
    tearDownSources,
} from "../../apis/payload_source.js";

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
    /* Kept here and not in the footer, the footer is re-registered on every wizard render */
    const [isApplying, setIsApplying] = useState(false);

    const footerHelperText =
        isApplying && (
            <Flex>
                <Spinner size="md" aria-label={_("Configuring installation source")} />
                <FlexItem>{_("Configuring installation source...")}</FlexItem>
            </Flex>
        );

    const onNext = async ({ goToNextStep }) => {
        if (!needsApply) {
            goToNextStep();
            return;
        }

        setIsApplying(true);
        setIsFormDisabled?.(true);
        try {
            await applyCurrentSource();
            goToNextStep();
        } catch {
            // Step notification is shown by applyCurrentSource.
        } finally {
            setIsApplying(false);
            setIsFormDisabled?.(false);
        }
    };

    return <AnacondaWizardFooter footerHelperText={footerHelperText} onNext={onNext} />;
};

export const InstallationSource = () => {
    const { isFormDisabled, setIsFormValid, setStepNotification } = useContext(PageContext) ?? {};
    const { source } = useContext(PayloadContext);

    const backendState = uiStateFromSource(source);
    const [protocol, setProtocol] = useState(backendState.protocol);
    const [url, setUrl] = useState(backendState.url);
    const [urlType, setUrlType] = useState(backendState.urlType);
    const [applyFailed, setApplyFailed] = useState(false);

    const isClosestMirror = isClosestMirrorProtocol(protocol);

    const handleProtocolChange = useCallback((_ev, val) => {
        setProtocol(val);
        if (isClosestMirrorProtocol(val)) {
            setUrl("");
            setUrlType("BASEURL");
        }
    }, []);

    useEffect(() => {
        setIsFormValid(isClosestMirror || url.trim().length > 0);
    }, [isClosestMirror, setIsFormValid, url]);

    const applySource = useCallback(async (desired) => {
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
        } catch (e) {
            setStepNotification?.({
                message: e.message || String(e),
                step: SCREEN_ID,
                title: _("Failed to configure installation source"),
            });
            throw e;
        }
    }, [setStepNotification]);

    const needsApply = applyFailed ||
        protocol !== backendState.protocol ||
        url !== backendState.url ||
        urlType !== backendState.urlType;

    const applyCurrentSource = useCallback(async () => {
        if (!needsApply) {
            return;
        }

        const uiState = { protocol, url, urlType };
        try {
            await applySource(buildDesiredSource(uiState, sourceConfiguration));
            setApplyFailed(false);
        } catch (e) {
            setApplyFailed(true);
            throw e;
        }
    }, [applySource, needsApply, protocol, sourceConfiguration, url, urlType]);

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
