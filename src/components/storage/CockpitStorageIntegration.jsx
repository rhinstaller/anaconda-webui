/*
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
    HelperTextItem,
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
import React, { useEffect, useMemo, useState } from "react";

import {
    ActionList,
    Alert,
    Button,
    Card,
    CardBody,
    Flex,
    FlexItem,
    HelperText,
    HelperTextItem,
    List,
    ListItem,
    Modal,
    PageSection,
    PageSectionVariants,
    Text,
    TextContent,
    Title,
} from "@patternfly/react-core";
import { ArrowLeftIcon } from "@patternfly/react-icons";

import { EmptyStatePanel } from "cockpit-components-empty-state";
import { checkConfiguredStorage, checkUseFreeSpace } from "./InstallationScenario.jsx";
import { useDiskTotalSpace, useDiskFreeSpace, useRequiredSize, useMountPointConstraints } from "./Common.jsx";

import {
    runStorageTask,
    scanDevicesWithTask,
} from "../../apis/storage.js";

import {
    unlockDevice,
} from "../../apis/storage_devicetree.js";
import {
    setBootloaderDrive,
} from "../../apis/storage_bootloader.js";
import {
    setInitializationMode,
} from "../../apis/storage_disk_initialization.js";
import {
    applyStorage,
    createPartitioning,
    gatherRequests,
    resetPartitioning,
    setManualPartitioningRequests
} from "../../apis/storage_partitioning.js";

import { getDevicesAction } from "../../actions/storage-actions.js";
import { getDeviceNameByPath } from "../../helpers/storage.js";

import "./CockpitStorageIntegration.scss";

const _ = cockpit.gettext;
const idPrefix = "cockpit-storage-integration";

const ReturnToInstallationButton = ({ isDisabled, onAction }) => (
    <Button
      icon={<ArrowLeftIcon />}
      id={idPrefix + "-return-to-installation-button"}
      isDisabled={isDisabled}
      variant="secondary"
      onClick={onAction}>
        {_("Return to installation")}
    </Button>
);

export const CockpitStorageIntegration = ({
    scenarioAvailability,
    scenarioPartitioningMapping,
    selectedDisks,
    setStorageScenarioId,
    deviceData,
    dispatch,
    onCritFail,
    setShowStorage,
}) => {
    const [showDialog, setShowDialog] = useState(false);
    const [needsResetPartitioning, setNeedsResetPartitioning] = useState(true);

    useEffect(() => {
        resetPartitioning().then(() => setNeedsResetPartitioning(false), onCritFail);
    }, [onCritFail]);

    return (
        <>
            <PageSection
              stickyOnBreakpoint={{ default: "top" }}
              variant={PageSectionVariants.light}
            >
                <Flex spaceItems={{ default: "spaceItemsLg" }}>
                    <Title headingLevel="h1" size="2xl">{_("Configure storage")}</Title>
                    <Alert
                      isInline
                      isPlain
                      title={_("Changes made here will immediately affect the system. There is no 'undo'.")}
                      variant="warning"
                    />
                </Flex>
            </PageSection>
            <div className={idPrefix + "-page-section-cockpit-storage"}>
                <PageSection>
                    <iframe
                      src="/cockpit/@localhost/storage/index.html"
                      name="cockpit-storage"
                      className={idPrefix + "-iframe-cockpit-storage"} />
                </PageSection>
                <ModifyStorageSideBar />
            </div>
            <PageSection
              className={idPrefix + "-page-section-storage-footer"}
              stickyOnBreakpoint={{ default: "bottom" }}
              variant={PageSectionVariants.light}
            >
                <ReturnToInstallationButton
                  isDisabled={needsResetPartitioning}
                  onAction={() => setShowDialog(true)} />
            </PageSection>
            {showDialog &&
            <CheckStorageDialog
              deviceData={deviceData}
              dispatch={dispatch}
              onCritFail={onCritFail}
              scenarioAvailability={scenarioAvailability}
              scenarioPartitioningMapping={scenarioPartitioningMapping}
              selectedDisks={selectedDisks}
              setShowDialog={setShowDialog}
              setShowStorage={setShowStorage}
              setStorageScenarioId={setStorageScenarioId}
            />}
        </>
    );
};

export const preparePartitioning = async ({ deviceData, newMountPoints }) => {
    try {
        await setBootloaderDrive({ drive: "" });

        const partitioning = await createPartitioning({ method: "MANUAL" });
        const requests = await gatherRequests({ partitioning });

        const addRequest = (devicePath, object, isSubVolume = false) => {
            const { dir, type, subvolumes, content } = object;
            let deviceSpec;
            if (!isSubVolume) {
                deviceSpec = getDeviceNameByPath(deviceData, devicePath);
            } else if (deviceData[devicePath]) {
                deviceSpec = devicePath;
            } else {
                return;
            }

            if (deviceSpec && (dir || type === "swap")) {
                const existingRequestIndex = (
                    requests.findIndex(request => request["device-spec"].v === deviceSpec)
                );

                if (existingRequestIndex !== -1) {
                    requests[existingRequestIndex] = {
                        "mount-point": cockpit.variant("s", dir || type),
                        "device-spec": cockpit.variant("s", deviceSpec),
                    };
                } else {
                    requests.push({
                        "mount-point": cockpit.variant("s", dir || type),
                        "device-spec": cockpit.variant("s", deviceSpec),
                    });
                }
            } else if (subvolumes) {
                Object.keys(subvolumes).forEach(subvolume => addRequest(subvolume, subvolumes[subvolume], true));
            } else if (type === "crypto") {
                const clearTextDevice = deviceData[deviceSpec].children.v[0];
                const clearTextDevicePath = deviceData[clearTextDevice].path.v;

                addRequest(clearTextDevicePath, content);
            }
        };

        Object.keys(newMountPoints).forEach(usedDevice => {
            addRequest(usedDevice, newMountPoints[usedDevice]);
        });

        await setManualPartitioningRequests({ partitioning, requests });
        return partitioning;
    } catch (error) {
        console.error("Failed to prepare partitioning", error);
    }
};

const CheckStorageDialog = ({
    deviceData,
    dispatch,
    onCritFail,
    scenarioPartitioningMapping,
    selectedDisks,
    setShowDialog,
    setShowStorage,
    setStorageScenarioId,
}) => {
    const [error, setError] = useState();
    const [checkStep, setCheckStep] = useState("rescan");
    const diskTotalSpace = useDiskTotalSpace({ selectedDisks, devices: deviceData });
    const diskFreeSpace = useDiskFreeSpace({ selectedDisks, devices: deviceData });
    const mountPointConstraints = useMountPointConstraints();
    const requiredSize = useRequiredSize();

    const newMountPoints = useMemo(() => JSON.parse(window.sessionStorage.getItem("cockpit_mount_points") || "{}"), []);
    const cockpitPassphrases = useMemo(() => JSON.parse(window.sessionStorage.getItem("cockpit_passphrases") || "{}"), []);

    const useConfiguredStorage = useMemo(() => {
        const availability = checkConfiguredStorage({
            mountPointConstraints,
            scenarioPartitioningMapping,
            newMountPoints,
        });

        return availability.available;
    }, [mountPointConstraints, newMountPoints, scenarioPartitioningMapping]);

    const useFreeSpace = useMemo(() => {
        const availability = checkUseFreeSpace({ diskFreeSpace, diskTotalSpace, requiredSize });

        return availability.available && !availability.hidden;
    }, [diskFreeSpace, diskTotalSpace, requiredSize]);

    const loading = !error && checkStep !== undefined;
    const storageRequirementsNotMet = !loading && (error || (!useConfiguredStorage && !useFreeSpace));

    useEffect(() => {
        if (!useConfiguredStorage && checkStep === "prepare-partitioning") {
            setCheckStep();
        }
    }, [useConfiguredStorage, checkStep]);

    useEffect(() => {
        if (checkStep !== "luks") {
            return;
        }

        const cockpitDevices = (
            Object.keys(newMountPoints)
                    .map(devicePath => ({
                        devicePath,
                        deviceName: getDeviceNameByPath(deviceData, devicePath),
                    }))
        );

        const devicesToUnlock = (
            cockpitDevices
                    .filter(({ devicePath, deviceName }) => {
                        return (
                            newMountPoints[devicePath].type === "crypto" &&
                            deviceData[deviceName].formatData.attrs.v.has_key !== "True"
                        );
                    })
                    .map(({ devicePath, deviceName }) => ({
                        deviceName,
                        passphrase: cockpitPassphrases[devicePath],
                    }))
        );

        if (devicesToUnlock.some(dev => !dev.passphrase)) {
            onCritFail()({ message: _("Cockpit storage did not provide the passphrase to unlock encrypted device.") });
        }

        if (devicesToUnlock.length === 0) {
            setCheckStep("prepare-partitioning");
            return;
        }

        Promise.all(devicesToUnlock.map(unlockDevice))
                .catch(exc => {
                    setCheckStep();
                    setError(exc);
                })
                .then(() => {
                    dispatch(getDevicesAction());
                });
    }, [dispatch, checkStep, cockpitPassphrases, newMountPoints, deviceData, onCritFail, setError]);

    useEffect(() => {
        // If the required devices needed for manual partitioning are set up,
        // and prepare the partitioning
        if (checkStep !== "prepare-partitioning") {
            return;
        }

        const applyNewPartitioning = async () => {
            // CLEAR_PARTITIONS_NONE = 0
            try {
                await setInitializationMode({ mode: 0 });
                const partitioning = await preparePartitioning({ deviceData, newMountPoints });

                applyStorage({
                    partitioning,
                    onFail: exc => {
                        setCheckStep();
                        setError(exc);
                    },
                    onSuccess: () => setCheckStep(),
                });
            } catch (exc) {
                setCheckStep();
                setError(exc);
            }
        };

        applyNewPartitioning();
    }, [deviceData, checkStep, newMountPoints, useConfiguredStorage]);

    useEffect(() => {
        if (checkStep !== "rescan" || useConfiguredStorage === undefined) {
            return;
        }

        // When the dialog is shown rescan to get latest configured storage
        // and check if we need to prepare manual partitioning
        scanDevicesWithTask()
                .then(task => {
                    return runStorageTask({
                        task,
                        onSuccess: () => dispatch(getDevicesAction())
                                .then(() => {
                                    if (useConfiguredStorage) {
                                        setCheckStep("luks");
                                    } else {
                                        setCheckStep();
                                    }
                                })
                                .catch(exc => {
                                    setCheckStep();
                                    setError(exc);
                                }),
                        onFail: exc => {
                            setCheckStep();
                            setError(exc);
                        }
                    });
                });
    }, [useConfiguredStorage, checkStep, dispatch, setError]);

    const goBackToInstallation = () => {
        const mode = useConfiguredStorage ? "use-configured-storage" : "use-free-space";

        setStorageScenarioId(mode);
        setShowStorage(false);
    };

    const loadingDescription = (
        <EmptyStatePanel
          loading
          title={_("Checking storage configuration")}
          paragraph={_("This will take a few moments")} />
    );

    const modalProps = {};
    if (!loading) {
        if (storageRequirementsNotMet) {
            modalProps.title = _("Storage requirements not met");
        } else {
            modalProps.title = _("Continue with installation");
        }
    } else {
        modalProps["aria-label"] = _("Checking storage configuration");
    }

    return (
        <Modal
          className={idPrefix + "-check-storage-dialog" + (loading ? "--loading" : "")}
          id={idPrefix + "-check-storage-dialog"}
          onClose={() => setShowDialog(false)}
          titleIconVariant={!loading && storageRequirementsNotMet && "warning"}
          position="top" variant="small" isOpen
          {...modalProps}
          footer={
              !loading &&
              <>
                  <ActionList>
                      {!storageRequirementsNotMet &&
                          <>
                              <Button
                                id={idPrefix + "-check-storage-dialog-continue"}
                                variant="primary"
                                onClick={goBackToInstallation}>
                                  {_("Continue")}
                              </Button>
                              <Button
                                id={idPrefix + "-check-storage-dialog-return"}
                                variant="link"
                                onClick={() => setShowDialog(false)}>
                                  {_("Return to storage editor")}
                              </Button>
                          </>}
                      {storageRequirementsNotMet &&
                          <>
                              <Button
                                variant="warning"
                                id={idPrefix + "-check-storage-dialog-return"}
                                onClick={() => setShowDialog(false)}>
                                  {_("Configure storage again")}
                              </Button>
                              <Button
                                id={idPrefix + "-check-storage-dialog-continue"}
                                variant="secondary"
                                onClick={() => setShowStorage(false)}>
                                  {_("Proceed with installation")}
                              </Button>
                          </>}
                  </ActionList>
              </>
          }
        >
            <>
                {loading && loadingDescription}
                {!loading &&
                <>
                    {storageRequirementsNotMet ? error?.message : null}
                    <HelperText>
                        {!storageRequirementsNotMet &&
                        <HelperTextItem variant="success" hasIcon>
                            {_("Current configuration can be used for installation.")}
                        </HelperTextItem>}
                    </HelperText>
                </>}
            </>
        </Modal>

    );
};

const ModifyStorageSideBar = () => {
    const mountPointConstraints = useMountPointConstraints();
    const requiredSize = useRequiredSize();

    if (mountPointConstraints === undefined) {
        return null;
    }

    const requiredConstraints = (
        mountPointConstraints.filter(constraint => constraint.required.v)
    );
    const recommendedConstraints = (
        mountPointConstraints.filter(constraint => !constraint.required.v && constraint.recommended.v)
    );
    const getConstraints = constraints => (
        <List className={idPrefix + "-requirements-hint-list"}>
            {constraints.map(constraint => {
                const item = [
                    constraint["mount-point"].v,
                    constraint["required-filesystem-type"].v
                ]
                        .filter(c => !!c)
                        .join(" ");

                return <ListItem key={item}>{item}</ListItem>;
            })}
        </List>
    );

    const requiredConstraintsSection = (
        requiredConstraints.length > 0 &&
        <>
            <Text component="p" className={idPrefix + "-requirements-hint"}>
                {_("If you are configuring partitions the following are required:")}
            </Text>
            {getConstraints(requiredConstraints)}
        </>
    );
    const recommendedConstraintsSection = (
        recommendedConstraints.length > 0 &&
        <>
            <Text component="p" className={idPrefix + "-requirements-hint"}>
                {_("Recommended partitions:")}
            </Text>
            {getConstraints(recommendedConstraints)}
        </>
    );

    return (
        <PageSection className={idPrefix + "-sidebar"}>
            <Card>
                <CardBody>
                    <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsLg" }}>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Requirements")}</Title>
                            <TextContent>
                                <Text component="p" className={idPrefix + "-requirements-hint"}>
                                    {cockpit.format(_("Fedora linux requires at least $0 of disk space."), cockpit.format_bytes(requiredSize))}
                                </Text>
                                <Text component="p" className={idPrefix + "-requirements-hint-detail"}>
                                    {_("You can either free up enough space here and let the installer handle the rest or manually set up partitions.")}
                                </Text>
                            </TextContent>
                        </FlexItem>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Partitions (advanced)")}</Title>
                            <TextContent>
                                {requiredConstraintsSection}
                                {recommendedConstraintsSection}
                            </TextContent>
                        </FlexItem>
                    </Flex>
                </CardBody>
            </Card>
        </PageSection>
    );
};
