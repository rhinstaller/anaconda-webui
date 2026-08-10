/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useState } from "react";
import {
    ActionGroup,
    Button,
    Form,
    FormGroup,
    FormHelperText,
} from "@patternfly/react-core/dist/esm/components";
import {
    Card,
    CardBody,
    CardTitle
} from "@patternfly/react-core/dist/esm/components/Card";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText";
import {
    TextInputGroup,
    TextInputGroupMain,
    TextInputGroupUtilities
} from "@patternfly/react-core/dist/esm/components/TextInputGroup";
import { Bullseye } from "@patternfly/react-core/dist/esm/layouts/Bullseye";
import { ExclamationCircleIcon } from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon";
import { EyeIcon } from "@patternfly/react-icons/dist/esm/icons/eye-icon";
import { EyeSlashIcon } from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon";

const _ = cockpit.gettext;

export const LoginPage = () => {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [pinHidden, setPinHidden] = useState(true);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!pin) {
            setError(_("Please enter a PIN"));
            return;
        }

        setIsLoading(true);

        const headers = {
            // Cockpit Basic auth format: user:password\0known_hosts
            // https://github.com/cockpit-project/cockpit/blob/25dd89e3d168861cd19acd50237f9c8884341cc5/pkg/static/login.js#L666
            Authorization: `Basic ${window.btoa(unescape(encodeURIComponent(`:${pin}`)))}`,
        };

        try {
            const response = await fetch("/cockpit/login", {
                headers,
                method: "GET",
            });

            if (!response.ok) {
                throw new Error("Authentication failed");
            }

            window.location = "/cockpit/@localhost/anaconda-webui/index.html";
        } catch (err) {
            setError(_("Invalid PIN. Please try again."));
            setIsLoading(false);
        }
    };

    return (

        <Bullseye>
            <Card>
                <CardTitle>{_("Enter PIN to access the installer")}</CardTitle>
                <CardBody>
                    <Form onSubmit={handleSubmit}>
                        <FormGroup isRequired fieldId="pin-input">
                            <TextInputGroup>
                                <TextInputGroupMain
                                  type={pinHidden ? "password" : "text"}
                                  inputId="pin-input"
                                  name="pin"
                                  value={pin}
                                  onChange={(_event, value) => setPin(value)}
                                  placeholder={_("Enter PIN")}
                                />
                                <TextInputGroupUtilities>
                                    <Button
                                      variant="plain"
                                      onClick={() => setPinHidden(!pinHidden)}
                                      aria-label={pinHidden ? _("Show PIN") : _("Hide PIN")}
                                    >
                                        {pinHidden ? <EyeIcon /> : <EyeSlashIcon />}
                                    </Button>
                                </TextInputGroupUtilities>
                            </TextInputGroup>
                            {error && (
                                <FormHelperText>
                                    <HelperText>
                                        <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                                            {error}
                                        </HelperTextItem>
                                    </HelperText>
                                </FormHelperText>
                            )}
                        </FormGroup>
                        <ActionGroup>
                            <Button
                              variant="primary"
                              type="submit"
                              isBlock
                              isLoading={isLoading}
                              isDisabled={isLoading}
                            >
                                {_("Log in")}
                            </Button>
                        </ActionGroup>
                    </Form>
                </CardBody>
            </Card>
        </Bullseye>

    );
};
