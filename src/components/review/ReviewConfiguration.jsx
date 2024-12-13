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
    Checkbox,
    DescriptionList,
    Flex, FlexItem,
    Stack,
    useWizardFooter,
} from "@patternfly/react-core";

import { getDeviceChildren } from "../../helpers/storage.js";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { LanguageContext, OsReleaseContext, StorageContext, SystemTypeContext, UsersContext } from "../Common.jsx";
import { useOriginalDevices, usePlannedActions } from "../storage/Common.jsx";
import { useScenario } from "../storage/InstallationScenario.jsx";
import { ReviewDescriptionListItem } from "./Common.jsx";
import { HostnameRow } from "./Hostname.jsx";
import { StorageReview, StorageReviewNote } from "./StorageReview.jsx";

import "./ReviewConfiguration.scss";

const _ = cockpit.gettext;
const idPrefix = "review";

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

const ReviewConfiguration = ({ setIsFormValid }) => {
    const osRelease = useContext(OsReleaseContext);
    const localizationData = useContext(LanguageContext);
    const accounts = useContext(UsersContext);
    const { label: scenarioLabel } = useScenario();
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    // Display custom footer
    const getFooter = useMemo(() => <CustomFooter setIsFormValid={setIsFormValid} />, [setIsFormValid]);
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
                    {isBootIso &&
                    <>
                        <ReviewDescriptionList>
                            <ReviewDescriptionListItem
                              id={`${idPrefix}-target-system-account`}
                              term={_("Account")}
                              description={accounts.fullName ? `${accounts.fullName} (${accounts.userName})` : accounts.userName}
                            />
                        </ReviewDescriptionList>
                        <ReviewDescriptionList>
                            <HostnameRow />
                        </ReviewDescriptionList>
                    </>}
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

const useConfirmationCheckboxLabel = () => {
    const [scenarioConfirmationLabel, setScenarioConfirmationLabel] = useState(null);
    const originalDevices = useOriginalDevices();
    const plannedActions = usePlannedActions();
    const { diskSelection } = useContext(StorageContext);
    const usableDisks = diskSelection.usableDisks;
    const selectedDisks = diskSelection.selectedDisks;

    const relevantDevices = selectedDisks
            .map(disk => getDeviceChildren({ device: disk, deviceData: originalDevices }))
            .flat(Infinity);
    const deviceHasAction = (actionType, device) => plannedActions.find(action => action["device-id"].v === device && action["action-type"].v === actionType);
    const deletedDevices = relevantDevices.filter(device => deviceHasAction("destroy", device));
    const resizedDevices = relevantDevices.filter(device => deviceHasAction("resize", device));

    const allDevicesDeleted = deletedDevices.length > 0 && deletedDevices.length === relevantDevices.length;
    const someDevicesDeleted = deletedDevices.length > 0 && deletedDevices.length < relevantDevices.length;
    const someDevicesResized = resizedDevices.length > 0;

    useEffect(() => {
        const allDevicesDeletedText = cockpit.ngettext(
            _("I understand that all existing data will be erased"),
            _("I understand that all existing data will be erased from the selected disks"),
            usableDisks.length
        );

        const someDevicesDeletedText = _("I understand that some existing data will be erased");
        const someDevicesResizedText = _("I understand that some partitions will be modified");

        if (allDevicesDeleted) {
            setScenarioConfirmationLabel(allDevicesDeletedText);
        } else if (someDevicesDeleted) {
            setScenarioConfirmationLabel(someDevicesDeletedText);
        } else if (someDevicesResized) {
            setScenarioConfirmationLabel(someDevicesResizedText);
        } else {
            setScenarioConfirmationLabel("");
        }
    }, [allDevicesDeleted, someDevicesDeleted, someDevicesResized, usableDisks.length]);

    return scenarioConfirmationLabel;
};

const CustomFooter = ({ setIsFormValid }) => {
    const { buttonLabel } = useScenario();
    const scenarioConfirmationLabel = useConfirmationCheckboxLabel();
    const installationIsClean = scenarioConfirmationLabel === "";
    const [isConfirmed, setIsConfirmed] = useState(false);

    const confirmationCheckbox = (
        !installationIsClean &&
        <Checkbox
          id={idPrefix + "-next-confirmation-checkbox"}
          label={scenarioConfirmationLabel}
          isChecked={isConfirmed}
          onChange={(_event, checked) => setIsConfirmed(checked)}
        />
    );

    useEffect(() => {
        setIsFormValid(isConfirmed || installationIsClean);
    }, [setIsFormValid, isConfirmed, installationIsClean]);

    return (
        <AnacondaWizardFooter
          footerHelperText={confirmationCheckbox}
          nextButtonText={buttonLabel}
          nextButtonVariant={!installationIsClean ? "warning" : "primary"}
          onNext={() => cockpit.location.go(["progress"])}
        />
    );
};

export class Page {
    constructor () {
        this.component = ReviewConfiguration;
        this.id = idPrefix;
        this.label = _("Review and install");
        this.title = _("Review and install");
    }
}
