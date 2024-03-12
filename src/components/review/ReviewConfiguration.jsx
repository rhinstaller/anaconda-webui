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
import {
    Button,
    DescriptionList, DescriptionListDescription,
    DescriptionListGroup, DescriptionListTerm,
    Flex, FlexItem,
    Form, FormGroup,
    FormHelperText, HelperText,
    HelperTextItem, Modal,
    ModalVariant, Stack,
    TextInput,
} from "@patternfly/react-core";

import { StorageReview } from "./StorageReview.jsx";
import {
    getAppliedPartitioning,
    getPartitioningMethod,
    getPartitioningRequest,
} from "../../apis/storage_partitioning.js";
import { getScenario } from "../storage/InstallationScenario.jsx";
import { OsReleaseContext } from "../Common.jsx";
import "./ReviewConfiguration.scss";
import { setHostname } from "../../apis/network.js";

const _ = cockpit.gettext;

const ReviewDescriptionList = ({ children }) => {
    return (
        <DescriptionList
          isHorizontal
          horizontalTermWidthModifier={{
              "2xl": "20ch",
              default: "12ch",
              lg: "20ch",
              md: "20ch",
              sm: "15ch",
              xl: "20ch",
          }}
        >
            {children}
        </DescriptionList>
    );
};

const ChangeHostname = ({ initHostname }) => {
    const [currentHostname, setCurrentHostname] = useState(initHostname);
    const [error, setError] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const validateHostname = (value) => {
        const validationError = [];
        if (value.length > 64) {
            validationError.push(_("Real host name must be 64 characters or less"));
        }

        if (!value.match(/^(?!-)[a-z0-9-]{1,63}(?<!-)$/)) {
            validationError.push(_("Real host name can only contain lower-case characters, digits, dashes (not starting or ending a label)"));
        }

        setError(validationError);
    };

    const onHostnameChanged = (value) => {
        validateHostname(value);
        setCurrentHostname(value);
    };
    const onSubmit = (event) => {
        setHostname({ hostname: currentHostname })
                .then(() => {
                    handleModalToggle();
                })
                .catch(() => {
                    setError("This host name can't be submitted");
                });

        if (event) {
            event.preventDefault();
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
              isInline aria-label="edit device name">
                {initHostname === "" ? _("set") : _("edit")}
            </Button>
            <Modal
              footer={
                  <>
                      <Button
                        variant="primary" isDisabled={disabled}
                        onClick={onSubmit}>{initHostname === "" ? _("Save") : _("Change")}
                      </Button>
                      <Button variant="link" onClick={handleModalToggle}>{_("Cancel")}</Button>
                  </>
              }
              id="system_information_change_hostname"
              isOpen={isModalOpen}
              onClose={onClose}
              position="top"
              title={initHostname === "" ? _("Set device name") : _("Change device name")}
              variant="small"
            >
                <Form isHorizontal onSubmit={onSubmit}>
                    <FormGroup fieldId="review-handle-hostname-hostname" label={_("Device name")}>
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
                                            {_("May contain letters, numbers, and dashes")}
                                        </HelperTextItem>
                                    </HelperText>
                                </FormHelperText>
                            )}
                    </FormGroup>
                </Form>
            </Modal>
        </>
    );
};

export const ReviewConfiguration = ({
    deviceData,
    diskSelection,
    language,
    localizationData,
    requests,
    idPrefix,
    setIsFormValid,
    storageScenarioId,
    accounts,
    hostname
}) => {
    const [encrypt, setEncrypt] = useState();
    const [initHostname, setInitHostname] = useState(hostname || "");
    const osRelease = useContext(OsReleaseContext);

    useEffect(() => {
        const initializeEncrypt = async () => {
            const partitioning = await getAppliedPartitioning()
                    .catch(console.error);
            const method = await getPartitioningMethod({ partitioning })
                    .catch(console.error);
            if (method === "AUTOMATIC") {
                const request = await getPartitioningRequest({ partitioning })
                        .catch(console.error);
                setEncrypt(request.encrypted.v);
            }
        };
        initializeEncrypt();
        setIsFormValid(true);
    }, [setIsFormValid]);

    useEffect(() => {
        setInitHostname(hostname || "");
    }, [hostname]);

    return (
        <Flex spaceItems={{ default: "spaceItemsMd" }} direction={{ default: "column" }}>
            <FlexItem>
                <ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <DescriptionListGroup>
                            <DescriptionListTerm>
                                {_("Operating system")}
                            </DescriptionListTerm>
                            <DescriptionListDescription id={idPrefix + "-target-operating-system"}>
                                {osRelease.PRETTY_NAME}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                </ReviewDescriptionList>
            </FlexItem>
            <FlexItem>
                <ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <DescriptionListGroup>
                            <DescriptionListTerm>
                                {_("Language")}
                            </DescriptionListTerm>
                            <DescriptionListDescription id={idPrefix + "-target-system-language"}>
                                {language ? language["native-name"].v : localizationData.language}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <DescriptionListGroup>
                            <DescriptionListTerm>
                                {_("Account")}
                            </DescriptionListTerm>
                            <DescriptionListDescription id={idPrefix + "-target-system-account"}>
                                {accounts.fullName ? `${accounts.fullName} (${accounts.userName})` : accounts.userName}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <DescriptionListGroup>
                            <DescriptionListTerm>
                                {_("Device name")}
                            </DescriptionListTerm>
                            <DescriptionListDescription id={idPrefix + "-target-system-hostname"}>
                                <Flex spaceItems={{ default: "spaceItemsMd" }} alignItems={{ default: "alignItemsCenter" }}>
                                    {initHostname !== "" && (
                                        <FlexItem>
                                            {initHostname}
                                        </FlexItem>
                                    )}
                                    <FlexItem>
                                        <ChangeHostname initHostname={initHostname} setInitHostname={setInitHostname} />
                                    </FlexItem>
                                </Flex>
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                </ReviewDescriptionList>
            </FlexItem>
            <FlexItem>
                <ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <DescriptionListGroup>
                            <DescriptionListTerm>
                                {_("Installation type")}
                            </DescriptionListTerm>
                            <DescriptionListDescription id={idPrefix + "-target-system-mode"}>
                                {getScenario(storageScenarioId).label}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                    {storageScenarioId !== "mount-point-mapping" &&
                        <ReviewDescriptionList>
                            <DescriptionListGroup>
                                <DescriptionListTerm>
                                    {_("Disk encryption")}
                                </DescriptionListTerm>
                                <DescriptionListDescription id={idPrefix + "-target-system-encrypt"}>
                                    {encrypt ? _("Enabled") : _("Disabled")}
                                </DescriptionListDescription>
                            </DescriptionListGroup>
                        </ReviewDescriptionList>}
                    <ReviewDescriptionList>
                        <DescriptionListGroup>
                            <DescriptionListTerm>
                                {_("Storage")}
                            </DescriptionListTerm>
                            <DescriptionListDescription id={idPrefix + "-target-storage"}>
                                <Stack hasGutter>
                                    <StorageReview
                                      deviceData={deviceData}
                                      requests={requests}
                                      selectedDisks={diskSelection.selectedDisks}
                                      storageScenarioId={storageScenarioId}
                                    />
                                </Stack>
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                </ReviewDescriptionList>
            </FlexItem>
        </Flex>
    );
};

export const ReviewConfigurationConfirmModal = ({
    idPrefix,
    onNext,
    setNextWaitsConfirmation,
    storageScenarioId
}) => {
    const scenario = getScenario(storageScenarioId);
    return (
        <Modal
          actions={[
              <Button
                id={idPrefix + "-disk-erase-confirm"}
                key="confirm"
                onClick={() => {
                    setNextWaitsConfirmation(false);
                    onNext();
                }}
                variant={scenario.buttonVariant}
              >
                  {scenario.buttonLabel}
              </Button>,
              <Button
                key="cancel"
                onClick={() => setNextWaitsConfirmation(false)}
                variant="link">
                  {_("Back")}
              </Button>
          ]}
          isOpen
          onClose={() => setNextWaitsConfirmation(false)}
          title={scenario.dialogWarningTitle}
          titleIconVariant={scenario.dialogTitleIconVariant}
          variant={ModalVariant.small}
        >
            {scenario.dialogWarning}
        </Modal>
    );
};

const ReviewConfigurationFooterHelperText = ({ storageScenarioId }) => {
    const reviewWarning = getScenario(storageScenarioId).screenWarning;

    return (
        <HelperText id="review-warning-text">
            <HelperTextItem
              variant="warning"
              hasIcon>
                {reviewWarning}
            </HelperTextItem>
        </HelperText>
    );
};

export const getPageProps = ({ storageScenarioId }) => {
    return ({
        footerHelperText: <ReviewConfigurationFooterHelperText storageScenarioId={storageScenarioId} />,
        id: "installation-review",
        label: _("Review and install"),
        nextButtonText: getScenario(storageScenarioId)?.buttonLabel,
        nextButtonVariant: "warning",
        title: _("Review and install"),
    });
};
