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
    Checkbox,
    DescriptionList,
    Flex, FlexItem,
    Stack,
    useWizardContext,
    useWizardFooter,
} from "@patternfly/react-core";

import { getDeviceChildren } from "../../helpers/storage.js";

import {
    FooterContext,
    LanguageContext,
    OsReleaseContext,
    StorageContext,
    SystemTypeContext,
    TimezoneContext,
    UserInterfaceContext,
    UsersContext,
} from "../../contexts/Common.jsx";

import {
    useFreeSystemMountPointsSpace,
    useOriginalDevices,
    usePlannedActions,
    useRequiredSize,
} from "../../hooks/Storage.jsx";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { useScenario } from "../storage/installation-method/InstallationScenario.jsx";
import { ReviewDescriptionListItem } from "./Common.jsx";
import { HostnameRow } from "./Hostname.jsx";
import { StorageReview, StorageReviewNote } from "./StorageReview.jsx";

import "./ReviewConfiguration.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-review";

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

const AccountsDescription = () => {
    const accounts = useContext(UsersContext);

    if (accounts.skipAccountCreation && accounts.isRootEnabled) {
        return _("Root account is enabled, but no user account has been configured");
    } else if (!accounts.skipAccountCreation && !accounts.isRootEnabled) {
        return accounts.fullName ? `${accounts.fullName} (${accounts.userName})` : accounts.userName;
    } else {
        return (
            <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsXs" }}>
                <div>{_("Root account is enabled")}</div>
                <div>{cockpit.format("User account: $0", accounts.fullName ? `${accounts.fullName} (${accounts.userName})` : accounts.userName)}</div>
            </Flex>
        );
    }
};

export const ReviewConfiguration = ({ setIsFormValid, setStepNotification }) => {
    const osRelease = useContext(OsReleaseContext);
    const localizationData = useContext(LanguageContext);
    const timezone = useContext(TimezoneContext)?.timezone;
    const { getLabel, id: scenarioId } = useScenario();
    const scenarioLabel = getLabel?.({ isReview: true });
    const userInterfaceConfig = useContext(UserInterfaceContext);
    const hiddenScreens = userInterfaceConfig.hidden_webui_pages || [];
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const [hasValidSpaceCheck, setHasValidSpaceCheck] = useState(true);
    const freeSpace = useFreeSystemMountPointsSpace();
    const requiredSize = useRequiredSize();
    const { setIsFormDisabled } = useContext(FooterContext);
    const { goToStepById } = useWizardContext();

    useEffect(() => {
        const step = SCREEN_ID;
        const hasInsufficientSpace = requiredSize > freeSpace;
        const fixupPage = scenarioId === "mount-point-mapping"
            ? "anaconda-screen-mount-point-mapping"
            : "anaconda-screen-method";

        if (hasInsufficientSpace) {
            const title = _("Not enough available free space");
            const message = cockpit.format(
                _("$0 is required, but only $1 is available."),
                cockpit.format_bytes(requiredSize),
                cockpit.format_bytes(freeSpace)
            );
            const actionLinks = (
                <Button
                  id={`${SCREEN_ID}-change-partition-layout`}
                  variant="link"
                  isInline
                  onClick={() => {
                      // Reset form state like the wizard does during navigation
                      setIsFormValid(false);
                      setIsFormDisabled(true);
                      cockpit.location.go([fixupPage]);
                      goToStepById(fixupPage);
                  }}
                >
                    {_("Change partition layout")}
                </Button>
            );
            setStepNotification({ actionLinks, message, step, title });
        } else {
            setStepNotification();
        }

        setHasValidSpaceCheck(!hasInsufficientSpace);
    }, [
        requiredSize,
        freeSpace,
        goToStepById,
        setIsFormDisabled,
        setIsFormValid,
        setStepNotification,
        setHasValidSpaceCheck,
        scenarioId,
    ]);

    // Display custom footer
    const getFooter = useMemo(() => (
        <CustomFooter
          setIsFormValid={setIsFormValid}
          hasValidSpaceCheck={hasValidSpaceCheck}
        />
    ), [setIsFormValid, hasValidSpaceCheck]);
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
                          id={`${SCREEN_ID}-target-operating-system`}
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
                          id={`${SCREEN_ID}-target-system-language`}
                          term={_("Language")}
                          description={language ? language["native-name"].v : localizationData.language}
                        />
                    </ReviewDescriptionList>
                    {!hiddenScreens.includes("anaconda-screen-date-time") &&
                    <ReviewDescriptionListItem
                      id={`${SCREEN_ID}-target-system-timezone`}
                      term={_("Timezone")}
                      description={timezone}
                    />}
                    {!hiddenScreens.includes("anaconda-screen-accounts") &&
                        <ReviewDescriptionList>
                            <ReviewDescriptionListItem
                              id={`${SCREEN_ID}-target-system-account`}
                              term={_("Account")}
                              description={<AccountsDescription />}
                            />
                        </ReviewDescriptionList>}
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
                          id={`${SCREEN_ID}-target-system-mode`}
                          term={_("Installation type")}
                          description={scenarioLabel}
                        />
                    </ReviewDescriptionList>
                    <ReviewDescriptionList>
                        <ReviewDescriptionListItem
                          id={`${SCREEN_ID}-target-storage`}
                          term={_("Storage")}
                          description={
                              <Stack hasGutter>
                                  <StorageReview isReviewScreen />
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

const CustomFooter = ({ hasValidSpaceCheck, setIsFormValid }) => {
    const { getButtonLabel } = useScenario();
    const buttonLabel = getButtonLabel?.();
    const scenarioConfirmationLabel = useConfirmationCheckboxLabel();
    const installationIsClean = scenarioConfirmationLabel === "";
    const [isConfirmed, setIsConfirmed] = useState(false);

    const confirmationCheckbox = (
        !installationIsClean &&
        <Checkbox
          id={SCREEN_ID + "-next-confirmation-checkbox"}
          label={scenarioConfirmationLabel}
          isChecked={isConfirmed}
          onChange={(_event, checked) => setIsConfirmed(checked)}
        />
    );

    useEffect(() => {
        const isConfirmationValid = isConfirmed || installationIsClean;
        setIsFormValid(isConfirmationValid && hasValidSpaceCheck);
    }, [setIsFormValid, isConfirmed, installationIsClean, hasValidSpaceCheck]);

    return (
        <AnacondaWizardFooter
          footerHelperText={confirmationCheckbox}
          nextButtonText={buttonLabel}
          nextButtonVariant={!installationIsClean ? "warning" : "primary"}
          onNext={() => cockpit.location.go(["anaconda-screen-progress"])}
        />
    );
};
