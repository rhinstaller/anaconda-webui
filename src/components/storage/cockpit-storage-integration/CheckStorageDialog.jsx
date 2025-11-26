/*
 * Copyright (C) 2025 Red Hat, Inc.
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
import { ActionList } from "@patternfly/react-core/dist/esm/components/ActionList/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import {
    runStorageTask,
    scanDevicesWithTask,
} from "../../../apis/storage.js";
import {
    unlockDevice,
} from "../../../apis/storage_devicetree.js";
import {
    setInitializationMode,
} from "../../../apis/storage_disk_initialization.js";
import {
    getSelectedDisks,
    setSelectedDisks
} from "../../../apis/storage_disks_selection.js";
import {
    applyStorage,
    createPartitioning,
    gatherRequests,
    resetPartitioning,
    setManualPartitioningRequests
} from "../../../apis/storage_partitioning.js";

import { getDevicesAction, setStorageScenarioAction } from "../../../actions/storage-actions.js";

import { debug as loggerDebug } from "../../../helpers/log.js";
import {
    bootloaderTypes,
    getDeviceAncestors,
    getDeviceByName,
    getDeviceByPath,
    getDeviceChildren,
    getUsableDevicesManualPartitioning,
} from "../../../helpers/storage.js";
import { checkIfArraysAreEqual } from "../../../helpers/utils.js";

import { StorageContext } from "../../../contexts/Common.jsx";

import {
    useOriginalDevices,
} from "../../../hooks/Storage.jsx";

import { EmptyStatePanel } from "cockpit-components-empty-state";

import { StorageReview } from "../../review/StorageReview.jsx";
import { useAvailabilityConfiguredStorage } from "../scenarios/use-configured-storage/UseConfiguredStorage.jsx";
import { useAvailabilityUseFreeSpace } from "../scenarios/use-free-space/UseFreeSpace.jsx";

const _ = cockpit.gettext;

const idPrefix = "cockpit-storage-integration";
const debug = loggerDebug.bind(null, idPrefix + ":");

const preparePartitioning = async ({ devices, newMountPoints, onFail }) => {
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
        return partitioning;
    } catch (error) {
        onFail(error);
    }
};

const handleMDRAID = ({ devices, onFail, refDevices, setNextCheckStep }) => {
    debug("mdarray step started");

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
                            debug("re-scan finished: Device got removed, adding parent disks to selected disks", disk);
                            return [...acc, ...refDevices.current[disk].parents.v];
                        } else {
                            debug("re-scan finished: Device got removed, removing from selected disks", disk);
                            return acc;
                        }
                    }
                    return [...acc, disk];
                }, [])
                .reduce((acc, disk) => {
                    const mdArray = devices[disk].children.v.filter(child => mdArrays.includes(child));
                    if (mdArray.length > 0) {
                        debug("re-scan finished: MD array found, replacing disk with mdarray", disk, mdArray);
                        return [...acc, mdArray[0]];
                    } else {
                        debug("re-scan finished: Keeping disk", disk);
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

    for (const device of Object.keys(devices)) {
        // FIXME: Do not allow stage1 device to be mdarray when this was created in Cockpit Storage
        // Cockpit Storage creates MDRAID with metadata 1.2, which is not supported by bootloaders
        // See more: https://bugzilla.redhat.com/show_bug.cgi?id=2355346
        const bootloaderDevice = bootloaderTypes.includes(devices[device].formatData.type.v);
        // PMBR does not have a bootloader necessarily
        const bootloaderDriveMDRAID = bootloaderDevice && getDeviceAncestors(devices, device).find(device => mdArrays.includes(device));

        if (bootloaderDriveMDRAID) {
            onFail({
                message: cockpit.format(
                    _("'$0' partition on MDRAID device $1 found. Bootloader partitions on MDRAID devices are not supported."),
                    devices[device].formatData.type.v,
                    devices[bootloaderDriveMDRAID].name.v
                )
            });
        }
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

    debug("luks step started");

    (async () => {
        try {
            await Promise.all(devicesToUnlock.map(unlockDevice));
            setNextCheckStep();
            dispatch(getDevicesAction());
        } catch (error) {
            onFail(error);
        }
    })();
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

const scanDevices = ({ dispatch, onFail, setNextCheckStep }) => {
    debug("rescan step started");

    // When the dialog is shown rescan to get latest configured storage
    // and check if we need to prepare manual partitioning
    (async () => {
        try {
            const task = await scanDevicesWithTask();
            runStorageTask({
                onFail,
                onSuccess: async () => {
                    try {
                        await resetPartitioning();
                        await dispatch(getDevicesAction());
                        setNextCheckStep();
                    } catch (error) {
                        onFail(error);
                    }
                },
                task
            });
        } catch (error) {
            onFail(error);
        }
    })();
};

const useStorageSetup = ({ dispatch, onCritFail, setError }) => {
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

        debug("useStorageSetup: running step", checkStep);

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
                    setNextCheckStep: () => setCheckStep(),
                });
                break;
            }
        };

        runStep();
    }, [
        checkStep,
        devices,
        dispatch,
        isFetching,
        newSelectedDisks,
        onCritFail,
        selectedDisks,
        setCheckStep,
        setError,
    ]);

    return checkStep !== undefined;
};

const CheckStorageDialogLoading = () => {
    const loadingDescription = (
        <EmptyStatePanel
          loading
          title={_("Checking storage configuration")}
          paragraph={_("This will take a few moments")} />
    );

    return (
        <Modal
          aria-label={_("Checking storage configuration")}
          className={idPrefix + "-check-storage-dialog--loading"}
          id={idPrefix + "-check-storage-dialog"}
          onClose={() => {}}
          position="top" variant="small" isOpen
        >
            <ModalBody>
                {loadingDescription}
            </ModalBody>
        </Modal>
    );
};

const CheckStorageDialogLoadingNewStorage = ({ dispatch, onCritFail, setError, setLoadingNewStorage }) => {
    const loadingNewStorage = useStorageSetup({
        dispatch,
        onCritFail,
        setError,
    });

    useEffect(() => {
        setLoadingNewStorage(loadingNewStorage);
    }, [loadingNewStorage, setLoadingNewStorage]);

    return <CheckStorageDialogLoading />;
};

const CheckStorageDialogLoadingNewPartitioning = ({ dispatch, newMountPoints, setError, setNeedsNewPartitioning }) => {
    const devices = useOriginalDevices();
    const useConfiguredStorage = useAvailabilityConfiguredStorage({ newMountPoints })?.available;
    const useFreeSpace = useAvailabilityUseFreeSpace({ allowReclaim: false })?.available;
    const mounted = useRef(false);

    useEffect(() => {
        if (mounted.current || useConfiguredStorage === undefined || useFreeSpace === undefined) {
            return;
        }
        mounted.current = true;

        // If "Use configured storage" is not available, skip Manual partitioning creation
        if (!useConfiguredStorage) {
            if (useFreeSpace) {
                dispatch(setStorageScenarioAction("use-free-space"));
            } else {
                dispatch(setStorageScenarioAction(""));
            }
            setNeedsNewPartitioning(false);
            return;
        } else {
            dispatch(setStorageScenarioAction("use-configured-storage"));
        }

        const onFail = (exc) => {
            setError(exc);
            setNeedsNewPartitioning(false);
        };
        debug("prepare partitioning step started");

        const applyNewPartitioning = async () => {
            // CLEAR_PARTITIONS_NONE = 0
            try {
                await setInitializationMode({ mode: 0 });
                const partitioning = await preparePartitioning({ devices, newMountPoints, onFail });

                applyStorage({
                    devices,
                    onFail,
                    onSuccess: () => setNeedsNewPartitioning(false),
                    partitioning,
                });
            } catch (exc) {
                onFail(exc);
            }
        };

        applyNewPartitioning();
    }, [devices, dispatch, newMountPoints, setError, setNeedsNewPartitioning, useConfiguredStorage, useFreeSpace]);

    return (
        <CheckStorageDialogLoading />
    );
};

const CheckStorageDialogLoaded = ({
    error,
    newMountPoints,
    setShowDialog,
    setShowStorage,
}) => {
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const selectedDisks = diskSelection.selectedDisks;

    const useConfiguredStorage = useAvailabilityConfiguredStorage({ newMountPoints })?.available;
    const useFreeSpace = useAvailabilityUseFreeSpace({ allowReclaim: false });

    const mdArrays = useMemo(() => {
        return Object.keys(devices).filter(device => devices[device].type.v === "mdarray");
    }, [devices]);
    const useEntireSoftwareDisk = useMemo(() => {
        return selectedDisks.every(disk => (
            mdArrays.includes(disk) &&
            getDeviceChildren({ device: disk, deviceData: devices }).every(child => devices[child].type.v !== "partition")
        ));
    }, [devices, mdArrays, selectedDisks]);

    const storageRequirementsNotMet = error || (!useConfiguredStorage && !useFreeSpace && !useEntireSoftwareDisk);

    const goBackToInstallation = () => {
        setShowStorage(false);
    };

    let title;
    if (storageRequirementsNotMet) {
        title = _("Storage requirements not met");
    } else {
        title = _("Continue with installation");
    }

    return (
        <Modal
          className={idPrefix + "-check-storage-dialog"}
          id={idPrefix + "-check-storage-dialog"}
          onClose={() => setShowDialog(false)}
          position="top" variant="small" isOpen
        >
            <ModalHeader
              title={title}
              titleIconVariant={storageRequirementsNotMet && "warning"}
            />
            <ModalBody>
                {storageRequirementsNotMet ? error?.message : null}
                <HelperText>
                    {!storageRequirementsNotMet &&
                    <HelperTextItem variant="success">
                        {useConfiguredStorage
                            ? (
                                <Stack hasGutter>
                                    <span>{_("Detected valid storage layout:")}</span>
                                    <StorageReview />
                                </Stack>
                            )
                            : (
                                useEntireSoftwareDisk ? _("Use the RAID device for automatic partitioning") : _("Use free space")
                            )}
                    </HelperTextItem>}
                </HelperText>
            </ModalBody>
            <ModalFooter>
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
            </ModalFooter>
        </Modal>

    );
};

export const CheckStorageDialog = ({ dispatch, onCritFail, setShowDialog, setShowStorage }) => {
    const [error, setError] = useState();

    const [loadingNewStorage, setLoadingNewStorage] = useState(true);
    const [needsNewPartitioning, setNeedsNewPartitioning] = useState(true);

    const loadingCommonProps = {
        dispatch,
        onCritFail,
        setError,
    };

    const newMountPoints = useMemo(() => JSON.parse(window.sessionStorage.getItem("cockpit_mount_points") || "{}"), []);

    return (
        <>
            {!error && loadingNewStorage &&
                <CheckStorageDialogLoadingNewStorage
                  setLoadingNewStorage={setLoadingNewStorage} {...loadingCommonProps}
                />}
            {!error && !loadingNewStorage && needsNewPartitioning &&
                <CheckStorageDialogLoadingNewPartitioning
                  newMountPoints={newMountPoints}
                  setNeedsNewPartitioning={setNeedsNewPartitioning} {...loadingCommonProps}
                />}
            {(error || (!loadingNewStorage && !needsNewPartitioning)) &&
                <CheckStorageDialogLoaded
                  error={error}
                  newMountPoints={newMountPoints}
                  setShowDialog={setShowDialog}
                  setShowStorage={setShowStorage}
                />}
        </>
    );
};
