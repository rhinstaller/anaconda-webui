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

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
    ActionList,
    Alert,
    Button,
    Card,
    CardBody,
    Content,
    Divider,
    DropdownItem,
    Flex,
    FlexItem,
    HelperText,
    HelperTextItem,
    List,
    ListItem,
    PageSection,
    Stack,
    Title,
    Tooltip
} from "@patternfly/react-core";
import {
    Modal,
    ModalVariant
} from "@patternfly/react-core/deprecated";
import { ArrowLeftIcon } from "@patternfly/react-icons";

import {
    runStorageTask,
    scanDevicesWithTask,
} from "../../apis/storage.js";
import {
    unlockDevice,
} from "../../apis/storage_devicetree.js";
import {
    setInitializationMode,
} from "../../apis/storage_disk_initialization.js";
import {
    getSelectedDisks,
    setSelectedDisks
} from "../../apis/storage_disks_selection.js";
import {
    applyStorage,
    createPartitioning,
    gatherRequests,
    resetPartitioning,
    setManualPartitioningRequests
} from "../../apis/storage_partitioning.js";

import { getDevicesAction, setStorageScenarioAction } from "../../actions/storage-actions.js";

import { debug } from "../../helpers/log.js";
import {
    bootloaderTypes,
    getDeviceAncestors,
    getDeviceByName,
    getDeviceByPath,
    getDeviceChildren,
    getUsableDevicesManualPartitioning,
} from "../../helpers/storage.js";
import { checkIfArraysAreEqual } from "../../helpers/utils.js";

import { StorageContext, TargetSystemRootContext } from "../../contexts/Common.jsx";

import {
    useDiskFreeSpace,
    useDiskTotalSpace,
    useMountPointConstraints,
    useOriginalDevices,
    useRequiredSize,
} from "../../hooks/Storage.jsx";

import { EmptyStatePanel } from "cockpit-components-empty-state";

import { checkConfiguredStorage } from "./scenarios/UseConfiguredStorage.jsx";
import { checkUseFreeSpace } from "./scenarios/UseFreeSpace.jsx";

import "./CockpitStorageIntegration.scss";

const _ = cockpit.gettext;
const idPrefix = "cockpit-storage-integration";

const ReturnToInstallationButton = ({ onAction }) => (
    <Button
      icon={<ArrowLeftIcon />}
      id={idPrefix + "-return-to-installation-button"}
      variant="secondary"
      onClick={onAction}>
        {_("Return to installation")}
    </Button>
);

export const useMaybeBackdrop = () => {
    const [hasDialogOpen, setHasDialogOpen] = useState(false);

    useEffect(() => {
        const handleStorageEvent = (event) => {
            if (event.key === "cockpit_has_modal") {
                setHasDialogOpen(event.newValue === "true");
            }
        };

        window.addEventListener("storage", handleStorageEvent);

        return () => window.removeEventListener("storage", handleStorageEvent);
    }, []);

    return hasDialogOpen ? "cockpit-has-modal" : "";
};

const CockpitStorageConfirmationModal = ({ handleCancelOpenModal, handleConfirmOpenModal, showConfirmation }) => {
    return (
        <Modal
          isOpen={showConfirmation}
          onClose={handleCancelOpenModal}
          title={_("Storage editor")}
          titleIconVariant="warning"
          variant="small"
          actions={[
              <Button
                id={idPrefix + "-enter-storage-confirm"}
                key="confirm"
                variant="warning"
                onClick={handleConfirmOpenModal}>
                  {_("Launch storage editor")}
              </Button>,
              <Button
                id={idPrefix + "-enter-storage-cancel"}
                key="cancel"
                variant="link"
                onClick={handleCancelOpenModal}>
                  {_("Cancel")}
              </Button>
          ]}
        >
            <Content>
                <Content component="p">
                    {_("The storage editor lets you resize, delete, and create partitions. It can set up LVM and much more. It is meant to be used as an advanced utility and not intended to be used in a typical installation.")}
                </Content>
                <Content component="strong">
                    {_("All changes made in the storage editor take effect immediately.")}
                </Content>
            </Content>
        </Modal>
    );
};

export const CockpitStorageIntegration = ({
    dispatch,
    onCritFail,
    setShowStorage,
}) => {
    const [showDialog, setShowDialog] = useState(false);
    const [isIframeMounted, setIsIframeMounted] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const backdropClass = useMaybeBackdrop();
    const handleIframeLoad = () => setIsIframeMounted(true);

    useEffect(() => {
        if (isIframeMounted) {
            const iframe = document.getElementById("cockpit-storage-frame");
            iframe.contentWindow.addEventListener("error", exception => {
                onCritFail({ context: _("Storage plugin failed"), isFrontend: true })({ message: exception.error.message, stack: exception.error.stack });
            });
        }
    }, [isIframeMounted, onCritFail]);

    const handleConfirmOpenModal = () => {
        setIsConfirmed(true);
        setShowStorage(true);
    };

    const handleCancelOpenModal = () => {
        setShowStorage(false);
        setIsConfirmed(false);
    };

    return (
        <>
            <CockpitStorageConfirmationModal
              handleCancelOpenModal={handleCancelOpenModal}
              handleConfirmOpenModal={handleConfirmOpenModal}
              showConfirmation={!isConfirmed}
            />
            <Modal
              aria-label={_("Configure storage")}
              className={backdropClass + " " + idPrefix + "-modal-page-section"}
              footer={<ReturnToInstallationButton onAction={() => setShowDialog(true)} />}
              hasNoBodyWrapper
              isOpen={isConfirmed}
              onClose={() => setShowDialog(true)}
              showClose={false}
              variant={ModalVariant.large}>
                <Alert
                  isInline
                  title={_("Changes made here will immediately affect the system. There is no 'undo'.")}
                  variant="warning"
                />
                <Divider />
                <div className={idPrefix + "-page-section-cockpit-storage"}>
                    <PageSection hasBodyWrapper={false}>
                        <iframe
                          src="/cockpit/@localhost/storage/index.html"
                          name="cockpit-storage"
                          id="cockpit-storage-frame"
                          onLoad={handleIframeLoad}
                          className={idPrefix + "-iframe-cockpit-storage"} />
                    </PageSection>
                    <ModifyStorageSideBar />
                </div>
                {showDialog &&
                    <CheckStorageDialog
                      dispatch={dispatch}
                      onCritFail={onCritFail}
                      setShowDialog={setShowDialog}
                      setShowStorage={setShowStorage}
                    />}
            </Modal>
        </>
    );
};

export const preparePartitioning = async ({ devices, newMountPoints, onFail }) => {
    try {
        const selectedDisks = await getSelectedDisks();
        const partitioning = await createPartitioning({ method: "MANUAL" });
        const requests = await gatherRequests({ partitioning });
        const usableDevices = getUsableDevicesManualPartitioning({ devices, selectedDisks });

        const addRequest = (device, object, isSubVolume = false, parent = undefined) => {
            const { content, dir, subvolumes, type } = object;
            let deviceSpec;
            if (!isSubVolume) {
                deviceSpec = getDeviceByPath(devices, device);
            } else {
                if (device === "/" && parent) {
                    /* It's possible that the user mounts the top-level volume
                     * Example newMountPoints object from Cockpit Storage:
                     * {
                     * ...
                     * "/dev/vda3": {
                     *     "type": "filesystem",
                     *     "subvolumes": {
                     *         "/": {
                     *             "dir": "/"
                     *         }
                     *     }
                     * },
                     * ...
                     * }
                     */
                    deviceSpec = getDeviceChildren({ device: parent, deviceData: devices })[0];
                } else {
                    deviceSpec = getDeviceByName(devices, device);
                }
            }

            if (!deviceSpec) {
                return;
            }

            if (usableDevices.includes(deviceSpec) && (dir || type === "swap")) {
                const existingRequestIndex = (
                    requests.findIndex(request => request["device-spec"].v === deviceSpec)
                );

                if (existingRequestIndex !== -1) {
                    requests[existingRequestIndex] = {
                        ...requests[existingRequestIndex],
                        "device-spec": cockpit.variant("s", deviceSpec),
                        "mount-point": cockpit.variant("s", dir || type),
                    };
                } else {
                    requests.push({
                        "device-spec": cockpit.variant("s", deviceSpec),
                        "mount-point": cockpit.variant("s", dir || type),
                    });
                }
            } else if (subvolumes) {
                Object.keys(subvolumes).forEach(subvolume => addRequest(subvolume, subvolumes[subvolume], true, deviceSpec));
            } else if (type === "crypto") {
                const clearTextDevice = devices[deviceSpec].children.v[0];
                const clearTextDevicePath = devices[clearTextDevice].path.v;

                addRequest(clearTextDevicePath, content);
            }
        };

        Object.keys(newMountPoints).forEach(usedDevice => {
            addRequest(usedDevice, newMountPoints[usedDevice]);
        });

        await setManualPartitioningRequests({ partitioning, requests });
        return [partitioning, requests];
    } catch (error) {
        onFail(error);
    }
};

const handleMDRAID = ({ devices, onFail, refDevices, setNextCheckStep }) => {
    debug("cockpit-storage-integration: mdarray step started");

    const mdArrays = Object.keys(devices).filter(device => devices[device].type.v === "mdarray");
    let ret;

    // In blivet we recognize two "types" of MD array:
    // * The array is directly on top of disks: in this case we consider the array to be a disk
    // (similar to a hardware RAID) and create the partition table on the array
    // * The array is on top of partitions: from our pov this is a device and we allow only a single
    // filesystem (or other format like lvmpv) on top of it and if it has partitions they are ignored
    //
    // For the first scenario, we need to re-set 'SelectedDisks' in backend,
    // for the new mdarrays to be handled as such.
    const setNewSelectedDisks = async () => {
        const selectedDisks = await getSelectedDisks();
        const newSelectedDisks = selectedDisks
                .reduce((acc, disk) => {
                    if (!devices[disk]) {
                        if (refDevices.current[disk]?.parents.v) {
                            debug("cockpit-storage-integration: re-scan finished: Device got removed, adding parent disks to selected disks", disk);
                            return [...acc, ...refDevices.current[disk].parents.v];
                        } else {
                            debug("cockpit-storage-integration: re-scan finished: Device got removed, removing from selected disks", disk);
                            return acc;
                        }
                    }
                    return [...acc, disk];
                }, [])
                .reduce((acc, disk) => {
                    const mdArray = devices[disk].children.v.filter(child => mdArrays.includes(child));
                    if (mdArray.length > 0) {
                        debug("cockpit-storage-integration: re-scan finished: MD array found, replacing disk with mdarray", disk, mdArray);
                        return [...acc, mdArray[0]];
                    } else {
                        debug("cockpit-storage-integration: re-scan finished: Keeping disk", disk);
                        return [...acc, disk];
                    }
                }, [])
                .filter((disk, index, disks) => disks.indexOf(disk) === index);

        if (!checkIfArraysAreEqual(selectedDisks, newSelectedDisks)) {
            setSelectedDisks({ drives: newSelectedDisks });
            ret = newSelectedDisks;
        }

        setNextCheckStep();
        return ret;
    };

    // Check if we have mdarrays that are not fitting in the above two scenarios
    // and show an error message
    const mdArraysNotSupported = mdArrays.filter(device => {
        // The user created a plain mdarray without any format to be used possible with 'Use entire disk'
        if (devices[device].formatData.type.v === "") {
            return false;
        }

        if (
            devices[device].parents.v.every(parent => devices[parent].type.v === "disk") &&
            devices[device].formatData.type.v === "disklabel"
        ) {
            return false;
        }
        if (
            devices[device].parents.v.every(parent => devices[parent].type.v === "partition") &&
            devices[device].formatData.type.v !== "disklabel"
        ) {
            return false;
        }
        return true;
    });
    // TODO: Consider moving this logic to the backend
    if (mdArraysNotSupported.length > 0) {
        onFail({
            message: cockpit.format(
                _("Invalid RAID configuration detected. If your RAID array is created directly on top of disks, a partition table must be created on the array. If your RAID array is created on top of partitions, it must contain a single filesystem or format (e.g., LVM PV). Any existing partitions on this array will be ignored.")
            )
        });
        return;
    }

    return setNewSelectedDisks();
};

const getDevicesToUnlock = ({ cockpitPassphrases, devices }) => {
    const devicesToUnlock = (
        Object.keys(cockpitPassphrases)
                .map(dev => {
                    let device = getDeviceByName(devices, dev);
                    if (!device) {
                        device = getDeviceByPath(devices, dev);
                    }

                    return ({
                        device,
                        passphrase: cockpitPassphrases[dev]
                    });
                }))
            .filter(({ device }) => {
                if (!device) {
                    return false;
                }

                return (
                    devices[device].formatData.type.v === "luks" &&
                        devices[device].formatData.attrs.v.has_key !== "True"
                );
            });

    return devicesToUnlock;
};

const unlockDevices = ({ devices, dispatch, onCritFail, onFail, setNextCheckStep }) => {
    const cockpitPassphrases = JSON.parse(window.sessionStorage.getItem("cockpit_passphrases") || "{}");
    const devicesToUnlock = getDevicesToUnlock({ cockpitPassphrases, devices });

    if (devicesToUnlock.some(dev => !dev.passphrase)) {
        onCritFail()({ message: _("Cockpit storage did not provide the passphrase to unlock encrypted device.") });
    }

    debug("cockpit-storage-integration: luks step started");

    Promise.all(devicesToUnlock.map(unlockDevice))
            .catch(onFail)
            .then(() => {
                setNextCheckStep();
                dispatch(getDevicesAction());
            });
};

const waitForUnlockedDevices = ({ devices, setNextCheckStep }) => {
    const cockpitPassphrases = JSON.parse(window.sessionStorage.getItem("cockpit_passphrases") || "{}");
    const devicesToUnlock = getDevicesToUnlock({ cockpitPassphrases, devices });

    if (devicesToUnlock.length === 0) {
        setNextCheckStep();
    }
};

const waitForNewSelectedDisks = ({ newSelectedDisks, selectedDisks, setNextCheckStep }) => {
    if (!newSelectedDisks || checkIfArraysAreEqual(newSelectedDisks, selectedDisks)) {
        setNextCheckStep();
    }
};

const prepareAndApplyPartitioning = ({ devices, newMountPoints, onFail, setNextCheckStep, useConfiguredStorage }) => {
    // If "Use configured storage" is not available, skip Manual partitioning creation
    if (!useConfiguredStorage) {
        setNextCheckStep();
        return;
    }

    debug("cockpit-storage-integration: prepare partitioning step started");

    const applyNewPartitioning = async () => {
        // CLEAR_PARTITIONS_NONE = 0
        try {
            await setInitializationMode({ mode: 0 });
            const [partitioning, requests] = await preparePartitioning({ devices, newMountPoints, onFail });

            // FIXME: Do not allow stage1 device to be mdarray when this was created in Cockpit Storage
            // Cockpit Storage creates MDRAID with metadata 1.2, which is not supported by bootloaders
            // See more: https://bugzilla.redhat.com/show_bug.cgi?id=2355346
            const bootloaderRequest = requests.find(request => bootloaderTypes.includes(request["format-type"].v));
            // PMBR does not have a bootloader necessarily
            const bootloaderDevice = bootloaderRequest?.["device-spec"].v;
            const bootloaderDriveMDRAID = bootloaderDevice && getDeviceAncestors(devices, bootloaderDevice).find(device => devices[device].type.v === "mdarray");
            if (bootloaderDriveMDRAID) {
                throw Error(
                    cockpit.format(
                        _("'$0' partition on MDRAID device $1 found. Bootloader partitions on MDRAID devices are not supported."),
                        bootloaderRequest["format-type"].v,
                        devices[bootloaderDriveMDRAID].name.v
                    )
                );
            }

            applyStorage({
                devices,
                onFail,
                onSuccess: setNextCheckStep,
                partitioning,
            });
        } catch (exc) {
            onFail(exc);
        }
    };

    applyNewPartitioning();
};

const scanDevices = ({ dispatch, onFail, setNextCheckStep }) => {
    debug("cockpit-storage-integration: rescan step started");

    // When the dialog is shown rescan to get latest configured storage
    // and check if we need to prepare manual partitioning
    scanDevicesWithTask()
            .then(task => {
                return runStorageTask({
                    onFail,
                    onSuccess: () => resetPartitioning()
                            .then(() => dispatch(getDevicesAction()))
                            .then(setNextCheckStep)
                            .catch(onFail),
                    task
                });
            });
};

const useStorageSetup = ({ dispatch, newMountPoints, onCritFail, setError, useConfiguredStorage }) => {
    const [checkStep, setCheckStep] = useState("rescan");
    const refCheckStep = useRef();
    const devices = useOriginalDevices();
    const refDevices = useRef(devices);
    const { isFetching } = useContext(StorageContext);
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const [newSelectedDisks, setNewSelectedDisks] = useState();

    useEffect(() => {
        if (refDevices.current !== undefined) {
            return;
        }
        refDevices.current = devices;
    }, [devices]);

    useEffect(() => {
        if (isFetching) {
            return;
        }

        // Avoid re-running a step if it's already running
        if (checkStep && refCheckStep.current === checkStep && !checkStep.startsWith("waitingFor")) {
            return;
        }
        refCheckStep.current = checkStep;

        debug("cockpit-storage-integration: useStorageSetup: running step", checkStep);

        const onFail = exc => {
            setCheckStep();
            setError(exc);
        };

        const runStep = async () => {
            switch (checkStep) {
            case "rescan":
                await scanDevices({
                    dispatch,
                    onFail,
                    setNextCheckStep: () => setCheckStep("luks"),
                });
                break;
            case "luks":
                await unlockDevices({
                    devices,
                    dispatch,
                    onCritFail,
                    onFail,
                    setNextCheckStep: () => setCheckStep("waitingForLuks"),
                });
                break;
            case "waitingForLuks":
                await waitForUnlockedDevices({
                    devices,
                    setNextCheckStep: () => setCheckStep("mdarray"),
                });
                break;
            case "mdarray": {
                const _newSelectedDisks = await handleMDRAID({
                    devices,
                    onFail,
                    refDevices,
                    setNextCheckStep: () => setCheckStep("waitingForNewSelectedDisks"),
                });
                setNewSelectedDisks(_newSelectedDisks);
                break;
            }
            case "waitingForNewSelectedDisks":
                await waitForNewSelectedDisks({
                    newSelectedDisks,
                    selectedDisks,
                    setNextCheckStep: () => setCheckStep("preparePartitioning"),
                });
                break;
            case "preparePartitioning":
                await prepareAndApplyPartitioning({
                    devices,
                    newMountPoints,
                    onFail,
                    setNextCheckStep: () => setCheckStep(),
                    useConfiguredStorage,
                });
                break;
            }
        };

        runStep();
    }, [checkStep, devices, dispatch, isFetching, newMountPoints, newSelectedDisks, onCritFail, setCheckStep, selectedDisks, setError, useConfiguredStorage]);

    return checkStep !== undefined;
};

const CheckStorageDialog = ({
    dispatch,
    onCritFail,
    setShowDialog,
    setShowStorage,
}) => {
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const selectedDisks = diskSelection.selectedDisks;

    const [error, setError] = useState();
    const diskTotalSpace = useDiskTotalSpace({ devices, selectedDisks });
    const diskFreeSpace = useDiskFreeSpace({ devices, selectedDisks });
    const mountPointConstraints = useMountPointConstraints();
    const requiredSize = useRequiredSize();

    const newMountPoints = useMemo(() => JSON.parse(window.sessionStorage.getItem("cockpit_mount_points") || "{}"), []);

    const useConfiguredStorage = useMemo(() => {
        const availability = checkConfiguredStorage({
            devices,
            mountPointConstraints,
            newMountPoints,
            selectedDisks,
        });
        return availability.available;
    }, [
        devices,
        mountPointConstraints,
        newMountPoints,
        selectedDisks,
    ]);

    const useConfiguredStorageReview = useMemo(() => {
        const availability = checkConfiguredStorage({
            devices,
            mountPointConstraints,
            newMountPoints,
            selectedDisks,
        });

        return availability.review;
    }, [
        devices,
        mountPointConstraints,
        newMountPoints,
        selectedDisks,
    ]);

    const useFreeSpace = useMemo(() => {
        const availability = checkUseFreeSpace({
            allowReclaim: false,
            diskFreeSpace,
            diskTotalSpace,
            requiredSize,
            selectedDisks,
        });

        return availability.available && !availability.hidden;
    }, [diskFreeSpace, diskTotalSpace, requiredSize, selectedDisks]);

    const mdArrays = useMemo(() => {
        return Object.keys(devices).filter(device => devices[device].type.v === "mdarray");
    }, [devices]);
    const useEntireSoftwareDisk = useMemo(() => {
        return selectedDisks.every(disk => (
            mdArrays.includes(disk) &&
            getDeviceChildren({ device: disk, deviceData: devices }).every(child => devices[child].type.v !== "partition")
        ));
    }, [devices, mdArrays, selectedDisks]);

    const storageStepsInProgress = useStorageSetup({
        dispatch,
        newMountPoints,
        onCritFail,
        setError,
        useConfiguredStorage,
    });
    const loading = !error && storageStepsInProgress;
    const storageRequirementsNotMet = !loading && (error || (!useConfiguredStorage && !useFreeSpace && !useEntireSoftwareDisk));

    useEffect(() => {
        const mode = useConfiguredStorage ? "use-configured-storage" : "use-free-space";

        dispatch(setStorageScenarioAction(mode));
    }, [useConfiguredStorage, dispatch]);

    const goBackToInstallation = () => {
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
                        <HelperTextItem variant="success" >
                            {useConfiguredStorage
                                ? (
                                    <Stack hasGutter>
                                        <span>{_("Detected valid storage layout:")}</span>
                                        {useConfiguredStorageReview}
                                    </Stack>
                                )
                                : (
                                    useEntireSoftwareDisk ? _("Use the RAID device for automatic partitioning") : _("Use free space")
                                )}
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
            <Content component="p" className={idPrefix + "-requirements-hint"}>
                {_("If you are configuring partitions the following are required:")}
            </Content>
            {getConstraints(requiredConstraints)}
        </>
    );
    const recommendedConstraintsSection = (
        recommendedConstraints.length > 0 &&
        <>
            <Content component="p" className={idPrefix + "-requirements-hint"}>
                {_("Recommended partitions:")}
            </Content>
            {getConstraints(recommendedConstraints)}
        </>
    );

    return (
        <PageSection hasBodyWrapper={false} className={idPrefix + "-sidebar"}>
            <Card>
                <CardBody>
                    <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsLg" }}>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Requirements")}</Title>
                            <Content>
                                <Content component="p" className={idPrefix + "-requirements-hint"}>
                                    {cockpit.format(_("Fedora linux requires at least $0 of disk space."), cockpit.format_bytes(requiredSize))}
                                </Content>
                                <Content component="p" className={idPrefix + "-requirements-hint-detail"}>
                                    {_("You can either free up enough space here and let the installer handle the rest or manually set up partitions.")}
                                </Content>
                            </Content>
                        </FlexItem>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Partitions (advanced)")}</Title>
                            <Content>
                                {requiredConstraintsSection}
                                {recommendedConstraintsSection}
                            </Content>
                        </FlexItem>
                    </Flex>
                </CardBody>
            </Card>
        </PageSection>
    );
};

export const ModifyStorage = ({ currentStepId, setShowStorage }) => {
    const targetSystemRoot = useContext(TargetSystemRootContext);
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const availableDevices = [
        ...diskSelection.selectedDisks,
        ...diskSelection.selectedDisks.map(disk => getDeviceAncestors(devices, disk)).flat(),
    ];
    const mountPointConstraints = useMountPointConstraints();
    const isEfi = mountPointConstraints?.some(c => c["required-filesystem-type"]?.v === "efi");
    const cockpitAnaconda = JSON.stringify({
        available_devices: availableDevices.map(device => devices[device].path.v),
        efi: isEfi,
        mount_point_prefix: targetSystemRoot,
    });
    // Allow to modify storage only when we are in the scenario selection page
    const isDisabled = currentStepId !== "anaconda-screen-method";
    const item = (
        <DropdownItem
          id="modify-storage"
          isAriaDisabled={isDisabled}
          onClick={() => {
              window.sessionStorage.setItem("cockpit_anaconda", cockpitAnaconda);
              setShowStorage(true);
          }}
        >
            {_("Launch storage editor")}
        </DropdownItem>
    );

    if (!isDisabled) {
        return item;
    } else {
        return (
            <Tooltip
              id="modify-storage-tooltip"
              content={_("Storage editor is available only in the `Installation method` step.")}>
                <span>
                    {item}
                </span>
            </Tooltip>
        );
    }
};
