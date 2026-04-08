/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useState } from "react";
import { Bullseye, ValidatedOptions } from "@patternfly/react-core";
import {
    ActionGroup,
    Button,
    Form,
    FormGroup,
    TextInputGroup,
    TextInputGroupMain,
    TextInputGroupUtilities,
} from "@patternfly/react-core/dist/esm/components";
import {
    Alert,
    AlertActionCloseButton
} from "@patternfly/react-core/dist/esm/components/Alert";
import {
    Card,
    CardBody,
    CardTitle
} from "@patternfly/react-core/dist/esm/components/Card";
import EyeIcon from "@patternfly/react-icons/dist/esm/icons/eye-icon";
import EyeSlashIcon from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon";

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
            Authorization: "Basic " + window.btoa(unescape(encodeURIComponent(pin))),
        };

        try {
            const response = await fetch("/cockpit/login", {
                method: "GET",
                headers
            });

            if (!response.ok) {
                throw new Error("Authentication failed");
            }

            window.location = "/cockpit/@localhost/anaconda-webui/index.html";
        } catch (err) {
            console.error("Login error:", err);
            setError(_("Invalid PIN. Please try again."));
            setIsLoading(false);
        }
    };

    return (

        <Bullseye>
            <Card>
                <CardTitle>{_("Enter PIN to access the installer")}</CardTitle>
                <CardBody>
                    {error && (
                        <Alert
                          variant="danger"
                          isInline
                          title={error}
                          actionClose={<AlertActionCloseButton onClose={() => setError("")} />}
                        />
                    )}
                    <Form onSubmit={handleSubmit}>
                        <FormGroup isRequired fieldId="pin-input">
                            <TextInputGroup validated={error ? ValidatedOptions.error : undefined}>
                                <TextInputGroupMain
                                  isRequired
                                  type={pinHidden ? "password" : "text"}
                                  id="pin-input"
                                  name="pin"
                                  value={pin}
                                  onChange={(_event, value) => setPin(value)}
                                  placeholder={_("Enter PIN")}

                                />
                                <TextInputGroupUtilities>
                                    <Button
                                      variant="plain"
                                      onClick={() => setPinHidden(!pinHidden)}
                                      aria-label={pinHidden ? _("Show password") : _("Hide password")}
                                      icon={pinHidden ? <EyeIcon /> : <EyeSlashIcon />}
                                    />
                                </TextInputGroupUtilities>
                            </TextInputGroup>
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
