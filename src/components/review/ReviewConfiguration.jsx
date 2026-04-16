/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { DescriptionList } from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { useWizardContext, useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import { getDeviceChildren } from "../../helpers/storage.js";

import {
    LanguageContext,
    OsReleaseContext,
    PageContext,
    PayloadContext,
    StorageContext,
    SystemTypeContext,
    TimezoneContext,
    UserInterfaceContext,
} from "../../contexts/Common.jsx";

import {
    useFreeSpaceForSystem,
    useOriginalDevices,
    usePlannedActions,
    useRequiredSize,
} from "../../hooks/Storage.jsx";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { usePageComplete as useDatetimePageComplete } from "../datetime/usePageComplete.js";
import { usePageComplete as useLocalizationPageComplete } from "../localization/usePageComplete.js";
import { usePageComplete as useSoftwarePageComplete } from "../software/usePageComplete.js";
import { useScenario } from "../storage/installation-method/InstallationScenario.jsx";
import { AccountsReviewDescription } from "../users/index.js";
import { ReviewDescriptionListItem } from "./Common.jsx";
import { HostnameRow } from "./Hostname.jsx";
import { StorageReview, StorageReviewNote } from "./StorageReview.jsx";

import "./ReviewConfiguration.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-review";

const IncompleteStepIndicator = () => (
    <Label isCompact status="danger">
        {_("incomplete")}
    </Label>
);

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

export const ReviewConfiguration = ({ automatedInstall }) => {
    const { setStepNotification } = useContext(PageContext) ?? {};
    const osRelease = useContext(OsReleaseContext);
    const localizationData = useContext(LanguageContext);
    const timezone = useContext(TimezoneContext)?.timezone;
    const { getLabel, id: scenarioId } = useScenario();
    const scenarioLabel = getLabel?.({ isReview: true });
    const userInterfaceConfig = useContext(UserInterfaceContext);
    const hiddenScreens = userInterfaceConfig.hidden_webui_pages || [];
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const [hasValidSpaceCheck, setHasValidSpaceCheck] = useState(true);
    const freeSpace = useFreeSpaceForSystem();
    const requiredSize = useRequiredSize();
    const { goToStepById } = useWizardContext();
    const languagePageHidden = hiddenScreens.includes("anaconda-screen-language");
    const localizationComplete = useLocalizationPageComplete({ isHidden: languagePageHidden });
    const datetimePageHidden = hiddenScreens.includes("anaconda-screen-date-time");
    const datetimeComplete = useDatetimePageComplete({ automatedInstall, isHidden: datetimePageHidden });
    const { environments, selection, type: payloadType } = useContext(PayloadContext) ?? {};
    const softwarePageHidden =
        payloadType !== "DNF" || hiddenScreens.includes("anaconda-screen-software-selection");
    const softwareComplete = useSoftwarePageComplete({ automatedInstall, isHidden: softwarePageHidden });

    const allPagesComplete =
        localizationComplete &&
        datetimeComplete &&
        softwareComplete === true;

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
        setStepNotification,
        setHasValidSpaceCheck,
        scenarioId,
    ]);

    // Display custom footer
    const getFooter = useMemo(() => (
        <CustomFooter allPagesComplete={allPagesComplete} hasValidSpaceCheck={hasValidSpaceCheck} />
    ), [allPagesComplete, hasValidSpaceCheck]);
    useWizardFooter(getFooter);

    const language = useMemo(() => {
        for (const l of Object.keys(localizationData.languages)) {
            const locale = localizationData.languages[l].locales.find(locale => locale["locale-id"].v === localizationData.language);

            if (locale) {
                return locale;
            }
        }
    }, [localizationData]);

    const languageDescription = localizationComplete
        ? (language ? language["native-name"].v : localizationData.language)
        : <IncompleteStepIndicator />;

    const timezoneDescription = datetimeComplete
        ? timezone
        : <IncompleteStepIndicator />;

    const softwareDescription = useMemo(() => {
        if (softwareComplete !== true) {
            return <IncompleteStepIndicator />;
        }
        const envId = selection?.environment;
        if (!envId) {
            return "";
        }
        const env = environments?.find(e => e.id === envId);
        return env?.name || envId;
    }, [softwareComplete, environments, selection?.environment]);

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
                          description={languageDescription}
                        />
                    </ReviewDescriptionList>
                    {!hiddenScreens.includes("anaconda-screen-date-time") &&
                    <ReviewDescriptionListItem
                      id={`${SCREEN_ID}-target-system-timezone`}
                      term={_("Timezone")}
                      description={timezoneDescription}
                    />}
                    {!softwarePageHidden &&
                    <ReviewDescriptionListItem
                      id={`${SCREEN_ID}-target-system-software`}
                      term={_("Software selection")}
                      description={softwareDescription}
                    />}
                    {!hiddenScreens.includes("anaconda-screen-accounts") &&
                        <ReviewDescriptionList>
                            <ReviewDescriptionListItem
                              id={`${SCREEN_ID}-target-system-account`}
                              term={_("Account")}
                              description={<AccountsReviewDescription />}
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
            "I understand that all existing data will be erased",
            "I understand that all existing data will be erased from the selected disks",
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

const CustomFooter = ({ allPagesComplete, hasValidSpaceCheck }) => {
    const { setIsFormValid } = useContext(PageContext) ?? {};
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
        setIsFormValid(isConfirmationValid && hasValidSpaceCheck && allPagesComplete);
    }, [setIsFormValid, isConfirmed, installationIsClean, hasValidSpaceCheck, allPagesComplete]);

    return (
        <AnacondaWizardFooter
          footerHelperText={confirmationCheckbox}
          nextButtonText={buttonLabel}
          nextButtonVariant={!installationIsClean ? "warning" : "primary"}
          onNext={() => cockpit.location.go(["anaconda-screen-progress"])}
        />
    );
};
