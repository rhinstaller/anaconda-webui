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
    DescriptionList,
    Flex, FlexItem,
    HelperText, HelperTextItem,
    Modal, ModalVariant,
    Stack,
    useWizardFooter,
} from "@patternfly/react-core";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { FooterContext, LanguageContext, OsReleaseContext, StorageContext, SystemTypeContext, UsersContext } from "../Common.jsx";
import { useScenario } from "../storage/InstallationScenario.jsx";
import { ReviewDescriptionListItem } from "./Common.jsx";
import { HostnameRow } from "./Hostname.jsx";
import { StorageReview, StorageReviewNote } from "./StorageReview.jsx";

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
                        <ReviewDescriptionListItem
                          id={`${idPrefix}-target-operating-system`}
                          term={_("Operating system")}
                          description={osRelease.PRETTY_NAME}
                        />
                    </ReviewDescriptionList>
                </ReviewDescriptionList>
            </FlexItem>
            <FlexItem>
                <ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <ReviewDescriptionListItem
                          id={`${idPrefix}-target-system-language`}
                          term={_("Language")}
                          description={language ? language["native-name"].v : localizationData.language}
                        />
                    </ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <ReviewDescriptionListItem
                          id={`${idPrefix}-target-system-account`}
                          term={_("Account")}
                          description={accounts.fullName ? `${accounts.fullName} (${accounts.userName})` : accounts.userName}
                        />
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
                        <ReviewDescriptionListItem
                          id={`${idPrefix}-target-system-mode`}
                          term={_("Installation type")}
                          description={scenarioLabel}
                        />
                    </ReviewDescriptionList>
                    {storageScenarioId !== "mount-point-mapping" &&
                    <ReviewDescriptionList>
                        <ReviewDescriptionListItem
                          id={`${idPrefix}-target-system-encrypt`}
                          term={_("Disk encryption")}
                          description={partitioning.method === "AUTOMATIC" && partitioning.requests[0].encrypted ? _("Enabled") : _("Disabled")}
                        />
                    </ReviewDescriptionList>}
                    <ReviewDescriptionList>
                        <ReviewDescriptionListItem
                          id={`${idPrefix}-target-storage`}
                          term={_("Storage")}
                          description={
                              <Stack hasGutter>
                                  <StorageReview />
                              </Stack>
                          }
                        />
                        <StorageReviewNote />
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
    const { buttonLabel } = useScenario();
    const pageProps = new Page();
    const footerHelperText = <ReviewConfigurationFooterHelperText />;

    return (
        <>
            {nextWaitsConfirmation &&
            <ReviewConfigurationConfirmModal
              idPrefix={pageProps.id}
              onNext={() => { setShowWizard(false); cockpit.location.go(["installation-progress"]) }}
              setNextWaitsConfirmation={setNextWaitsConfirmation}
            />}
            <AnacondaWizardFooter
              footerHelperText={footerHelperText}
              nextButtonText={buttonLabel}
              nextButtonVariant="warning"
              onNext={() => nextWaitsConfirmation === undefined && setNextWaitsConfirmation(true)}
            />
        </>
    );
};

export class Page {
    constructor () {
        this.component = ReviewConfiguration;
        this.id = "installation-review";
        this.label = _("Review and install");
        this.title = _("Review and install");
    }
}
