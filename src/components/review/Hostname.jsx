/*
 * Copyright (C) 2022 Red Hat, Inc.
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

import React, { useContext, useEffect, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { DescriptionListDescription, DescriptionListGroup, DescriptionListTerm } from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { Form, FormGroup, FormHelperText } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import { setHostname } from "../../apis/network.js";

import { NetworkContext } from "../../contexts/Common.jsx";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-review";

const ChangeHostname = ({ initHostname }) => {
    const [currentHostname, setCurrentHostname] = useState(initHostname);
    const [error, setError] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const validateHostname = (value) => {
        const validationError = [];
        if (value.length > 64) {
            validationError.push(_("Real hostname must be 64 characters or less"));
        }

        if (!value.match(/^$|^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/)) {
            validationError.push(_("Real hostname can only contain characters, digits, dashes (not starting or ending a character) and dots"));
        }

        setError(validationError);
    };

    const onHostnameChanged = (value) => {
        validateHostname(value);
        setCurrentHostname(value);
    };
    const onSubmit = async (event) => {
        if (event) {
            event.preventDefault();
        }

        try {
            await setHostname({ hostname: currentHostname });
            handleModalToggle();
        } catch (error) {
            setError(_("This hostname can't be submitted"));
        }

        return false;
    };

    const handleModalToggle = () => {
        setIsModalOpen(!isModalOpen);
    };

    const onClose = () => {
        setCurrentHostname(initHostname);
        setError([]);
        handleModalToggle();
    };

    const disabled = error.length || (initHostname === currentHostname);
    return (
        <>
            <Button
              id="system_information_hostname_button" variant="link"
              onClick={handleModalToggle}
              isInline aria-label="edit hostname">
                {_("edit")}
            </Button>
            <Modal
              id="system_information_change_hostname"
              isOpen={isModalOpen}
              onClose={onClose}
              position="top"
              variant="small"
            >
                <ModalHeader
                  title={initHostname === "" ? _("Set custom hostname") : _("Change hostname")}
                />
                <ModalBody>
                    <Form isHorizontal onSubmit={onSubmit}>
                        <FormGroup fieldId="review-handle-hostname-hostname" label={_("Hostname")}>
                            <TextInput
                              id="review-handle-hostname-hostname" value={currentHostname}
                              onChange={(_event, value) => onHostnameChanged(value)}
                              validated={error.length ? "error" : "default"} />
                            {error.length > 0
                                ? (
                                    <FormHelperText>
                                        <HelperText>
                                            {error.map((err, i) =>
                                                <HelperTextItem key={i} variant="error">
                                                    {err}
                                                </HelperTextItem>
                                            )}
                                        </HelperText>
                                    </FormHelperText>)
                                : (
                                    <FormHelperText>
                                        <HelperText>
                                            <HelperTextItem>
                                                {_("May contain letters, numbers, and dashes.")}
                                            </HelperTextItem>
                                            <HelperTextItem>
                                                {_("If empty, hostname will be transient and set by network information.")}
                                            </HelperTextItem>
                                        </HelperText>
                                    </FormHelperText>
                                )}
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button
                      variant="primary" isAriaDisabled={disabled}
                      onClick={onSubmit}>{initHostname === "" ? _("Save") : _("Change")}
                    </Button>
                    <Button variant="link" onClick={onClose}>{_("Cancel")}</Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export const HostnameRow = () => {
    const network = useContext(NetworkContext);
    const [initHostname, setInitHostname] = useState(network.hostname || "");

    useEffect(() => {
        setInitHostname(network.hostname);
    }, [network.hostname]);

    return (
        <DescriptionListGroup>
            <DescriptionListTerm>
                {_("Hostname")}
            </DescriptionListTerm>
            <DescriptionListDescription id={SCREEN_ID + "-target-system-hostname"}>
                <Flex
                  spaceItems={{ default: "spaceItemsMd" }}
                  alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem>
                        {initHostname !== ""
                            ? initHostname
                            : <div className="pf-v6-u-color-400">transient, will use DHCP</div>}
                    </FlexItem>
                    <FlexItem>
                        <ChangeHostname
                          initHostname={initHostname}
                          setInitHostname={setInitHostname} />
                    </FlexItem>
                </Flex>
            </DescriptionListDescription>
        </DescriptionListGroup>
    );
};
