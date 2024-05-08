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

import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    Button,
    DescriptionList, DescriptionListDescription,
    DescriptionListGroup, DescriptionListTerm,
    Flex, FlexItem,
    HelperText, HelperTextItem,
    Modal, ModalVariant,
    Stack,
    useWizardFooter,
} from "@patternfly/react-core";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { FooterContext, LanguageContext, OsReleaseContext, StorageContext, SystemTypeContext, UsersContext } from "../Common.jsx";
import { useScenario } from "../storage/InstallationScenario.jsx";
import { HostnameRow } from "./Hostname.jsx";
import { StorageReview } from "./StorageReview.jsx";

import "./ReviewConfiguration.scss";

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

const ReviewConfiguration = ({ idPrefix, setIsFormValid }) => {
    const osRelease = useContext(OsReleaseContext);
    const localizationData = useContext(LanguageContext);
    const accounts = useContext(UsersContext);
    const { partitioning, storageScenarioId } = useContext(StorageContext);
    const { label: scenarioLabel } = useScenario();
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    useEffect(() => {
        setIsFormValid(true);
    }, [setIsFormValid]);

    // Display custom footer
    const getFooter = useMemo(() => <CustomFooter />, []);
    useWizardFooter(getFooter);

    const language = useMemo(() => {
        for (const l of Object.keys(localizationData.languages)) {
            const locale = localizationData.languages[l].locales.find(locale => locale["locale-id"].v === localizationData.language);

            if (locale) {
                return locale;
            }
        }
    }, [localizationData]);

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
                    {isBootIso &&
                    <ReviewDescriptionList>
                        <HostnameRow />
                    </ReviewDescriptionList>}
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
                                {scenarioLabel}
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
                                {partitioning.method === "AUTOMATIC" && partitioning.requests[0].encrypted ? _("Enabled") : _("Disabled")}
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
                                    <StorageReview />
                                </Stack>
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </ReviewDescriptionList>
                </ReviewDescriptionList>
            </FlexItem>
        </Flex>
    );
};

export const ReviewConfigurationConfirmModal = ({ idPrefix, onNext, setNextWaitsConfirmation }) => {
    const { buttonLabel, buttonVariant, dialogTitleIconVariant, dialogWarning, dialogWarningTitle } = useScenario();
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
                variant={buttonVariant}
              >
                  {buttonLabel}
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
          title={dialogWarningTitle}
          titleIconVariant={dialogTitleIconVariant}
          variant={ModalVariant.small}
        >
            {dialogWarning}
        </Modal>
    );
};

const ReviewConfigurationFooterHelperText = () => {
    const { screenWarning } = useScenario();

    return (
        <HelperText id="review-warning-text">
            <HelperTextItem
              variant="warning"
              hasIcon>
                {screenWarning}
            </HelperTextItem>
        </HelperText>
    );
};

const CustomFooter = () => {
    const [nextWaitsConfirmation, setNextWaitsConfirmation] = useState();
    const { setShowWizard } = useContext(FooterContext);
    const pageProps = usePage();

    return (
        <>
            {nextWaitsConfirmation &&
            <ReviewConfigurationConfirmModal
              idPrefix={pageProps.id}
              onNext={() => { setShowWizard(false); cockpit.location.go(["installation-progress"]) }}
              setNextWaitsConfirmation={setNextWaitsConfirmation}
            />}
            <AnacondaWizardFooter
              footerHelperText={pageProps.footerHelperText}
              nextButtonText={pageProps.nextButtonText}
              nextButtonVariant={pageProps.nextButtonVariant}
              onNext={() => nextWaitsConfirmation === undefined && setNextWaitsConfirmation(true)}
            />
        </>
    );
};

export const usePage = () => {
    const { buttonLabel } = useScenario();

    return ({
        component: ReviewConfiguration,
        footerHelperText: <ReviewConfigurationFooterHelperText />,
        id: "installation-review",
        label: _("Review and install"),
        nextButtonText: buttonLabel,
        nextButtonVariant: "warning",
        title: _("Review and install"),
    });
};
