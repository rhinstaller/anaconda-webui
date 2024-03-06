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
    HelperText, HelperTextItem,
    Modal, ModalVariant,
    Stack,
} from "@patternfly/react-core";

import {
    getAppliedPartitioning,
    getPartitioningMethod,
    getPartitioningRequest,
} from "../../apis/storage_partitioning.js";

import { getScenario } from "../storage/InstallationScenario.jsx";
import { OsReleaseContext } from "../Common.jsx";
import { StorageReview } from "./StorageReview.jsx";

import "./ReviewConfiguration.scss";

const _ = cockpit.gettext;

const ReviewDescriptionList = ({ children }) => {
    return (
        <DescriptionList
          isHorizontal
          horizontalTermWidthModifier={{
              default: "12ch",
              sm: "15ch",
              md: "20ch",
              lg: "20ch",
              xl: "20ch",
              "2xl": "20ch",
          }}
        >
            {children}
        </DescriptionList>
    );
};

export const ReviewConfiguration = ({ deviceData, diskSelection, language, localizationData, requests, idPrefix, setIsFormValid, storageScenarioId, accounts }) => {
    const [encrypt, setEncrypt] = useState();
    const osRelease = useContext(OsReleaseContext);

    useEffect(() => {
        const initializeEncrypt = async () => {
            const partitioning = await getAppliedPartitioning().catch(console.error);
            const method = await getPartitioningMethod({ partitioning }).catch(console.error);
            if (method === "AUTOMATIC") {
                const request = await getPartitioningRequest({ partitioning }).catch(console.error);
                setEncrypt(request.encrypted.v);
            }
        };
        initializeEncrypt();
        setIsFormValid(true);
    }, [setIsFormValid]);

    return (
        <>
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
        </>
    );
};

export const ReviewConfigurationConfirmModal = ({ idPrefix, onNext, setNextWaitsConfirmation, storageScenarioId }) => {
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
        id: "installation-review",
        label: _("Review and install"),
        title: _("Review and install"),
        footerHelperText: <ReviewConfigurationFooterHelperText storageScenarioId={storageScenarioId} />,
        nextButtonText: getScenario(storageScenarioId)?.buttonLabel,
        nextButtonVariant: "warning",
    });
};
