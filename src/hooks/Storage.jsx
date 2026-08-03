/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { useContext, useEffect, useMemo, useRef, useState } from "react";

import {
    getRequiredSpace
} from "../apis/payloads.js";
import {
    getDiskFreeSpace,
    getDiskTotalSpace,
    getFormatTypeData,
    getFreeSpaceForSystem,
    getMountPointConstraints,
    getRequiredDeviceSize,
} from "../apis/storage_devicetree.js";
import {
    setInitializationMode,
    setInitializeLabelsEnabled,
} from "../apis/storage_disk_initialization.js";
import {
    createPartitioning,
    getDeviceTree,
    partitioningSetEncrypt,
    partitioningSetHomeReuse,
    partitioningSetPassphrase,
    resetPartitioning,
} from "../apis/storage_partitioning.js";

import {
    getDeviceAncestors,
    hasReusableFedoraWithWindowsOS,
    intersectSelectedDisksWithUsable,
    systemMountPoints,
} from "../helpers/storage.js";

import { PageContext, StorageContext, StorageDefaultsContext, TargetSystemRootContext } from "../contexts/Common.jsx";

import { scenarios } from "../components/storage/scenarios/index.js";

export const useDiskTotalSpace = () => {
    const [diskTotalSpace, setDiskTotalSpace] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const usableDisks = diskSelection.usableDisks;

    useEffect(() => {
        const update = async () => {
            const diskNames = intersectSelectedDisksWithUsable(selectedDisks, usableDisks);
            const diskTotalSpace = await getDiskTotalSpace({ diskNames });

            setDiskTotalSpace(diskTotalSpace);
        };
        update();
    }, [selectedDisks, usableDisks, devices]);

    return diskTotalSpace;
};

export const useDiskFreeSpace = () => {
    const [diskFreeSpace, setDiskFreeSpace] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const usableDisks = diskSelection.usableDisks;

    useEffect(() => {
        const update = async () => {
            const diskNames = intersectSelectedDisksWithUsable(selectedDisks, usableDisks);
            const diskFreeSpace = await getDiskFreeSpace({ diskNames });

            setDiskFreeSpace(diskFreeSpace);
        };
        update();
    }, [selectedDisks, usableDisks, devices]);

    return diskFreeSpace;
};

export const useFreeSpaceForSystem = () => {
    const [freeSpaceForSystem, setFreeSpaceForSystem] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const plannedDeviceTree = useDeviceTree();

    useEffect(() => {
        const update = async () => {
            const freeSpaceForSystem = await getFreeSpaceForSystem({ mountPoints: systemMountPoints });

            setFreeSpaceForSystem(freeSpaceForSystem);
        };
        update();
    }, [selectedDisks, devices, plannedDeviceTree]);

    return freeSpaceForSystem;
};

export const useUsablePartitions = () => {
    const [usablePartitions, setUsablePartitions] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    useEffect(() => {
        const _usablePartitions = Object.values(devices).filter(device => {
            const ancestors = getDeviceAncestors(devices, device["device-id"].v);

            return (
                device.formatData?.type.v === "biosboot" ||
             device.formatData?.mountable.v ||
             device.formatData?.type.v === "luks") &&
             ancestors.some(ancestor => selectedDisks.includes(ancestor));
        });

        setUsablePartitions(_usablePartitions);
    }, [selectedDisks, devices]);

    return usablePartitions;
};

export const useRequiredSpace = () => {
    const [requiredSpace, setRequiredSpace] = useState();

    useEffect(() => {
        const update = async () => {
            const requiredSpace = await getRequiredSpace();

            setRequiredSpace(requiredSpace);
        };
        update();
    }, []);

    return requiredSpace;
};

export const useRequiredSize = () => {
    const [requiredSize, setRequiredSize] = useState();

    useEffect(() => {
        const update = async () => {
            const requiredSpace = await getRequiredSpace();
            const requiredSize = await getRequiredDeviceSize({ requiredSpace });

            setRequiredSize(requiredSize);
        };
        update();
    }, []);

    return requiredSize;
};

export const useMountPointConstraints = () => {
    const [mountPointConstraints, setMountPointConstraints] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const usableDisks = diskSelection.usableDisks;

    useEffect(() => {
        const update = async () => {
            const diskNames = intersectSelectedDisksWithUsable(selectedDisks, usableDisks);
            let _mountPointConstraints = await getMountPointConstraints({ diskNames });
            _mountPointConstraints = await Promise.all(_mountPointConstraints.map(async c => {
                let description = "";
                const formatType = c["required-filesystem-type"].v;
                if (formatType) {
                    const formatData = await getFormatTypeData({ formatType });
                    description = formatData.description.v;
                }
                return { ...c, description };
            }));
            setMountPointConstraints(_mountPointConstraints);
        };
        update();
    }, [selectedDisks, usableDisks, devices]);

    return mountPointConstraints;
};

export const useHomeReuseOptions = () => {
    const originalExistingSystems = useOriginalExistingSystems();
    const { defaultScheme } = useContext(StorageDefaultsContext);
    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    const reuseEFIPart = useMemo(
        () => hasReusableFedoraWithWindowsOS(devices, selectedDisks, originalExistingSystems),
        [devices, selectedDisks, originalExistingSystems]
    );

    return {
        reuseEFIPart,
        scheme: defaultScheme,
    };
};

export const getNewPartitioning = async ({
    currentPartitioning,
    homeReuseOptions,
    method = "AUTOMATIC",
    storageScenarioId,
}) => {
    const initializationMode = scenarios.find(sc => sc.id === storageScenarioId).initializationMode;
    await setInitializationMode({ mode: initializationMode });

    if (method === "AUTOMATIC") {
        await setInitializeLabelsEnabled({ enabled: true });
    }

    const part = await createPartitioning({ method });

    if (storageScenarioId === "home-reuse") {
        await partitioningSetHomeReuse({ homeReuseOptions, partitioning: part });
    }

    if (currentPartitioning?.method === method &&
        method === "AUTOMATIC" &&
        storageScenarioId !== "home-reuse" &&
        currentPartitioning.requests[0].encrypted) {
        await partitioningSetEncrypt({ encrypt: true, partitioning: part });
        await partitioningSetPassphrase({ partitioning: part, passphrase: currentPartitioning.requests[0].passphrase });
    }

    return part;
};

export const usePartitioningReset = () => {
    const { setIsFormDisabled } = useContext(PageContext) ?? {};
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const pageHasMounted = useRef(false);
    // Always reset the partitioning when entering the installation destination page
    // If the last partitioning applied was from the cockpit storage integration
    // or from a kickstart we should not reset it
    const needsReset = partitioning.storageScenarioId !== "use-configured-storage" &&
        partitioning.storageScenarioId !== "use-configured-storage-kickstart" &&
        appliedPartitioning &&
        pageHasMounted.current !== true;

    useEffect(() => {
        pageHasMounted.current = true;
        if (needsReset) {
            resetPartitioning();
        } else {
            setIsFormDisabled(false);
        }
    }, [needsReset, setIsFormDisabled]);

    return !needsReset;
};

export const useDeviceTree = () => {
    const [deviceTreePath, setDeviceTreePath] = useState();
    const { appliedPartitioning, deviceTrees } = useContext(StorageContext);

    useEffect(() => {
        const _getDeviceTree = async () => {
            const _deviceTreePath = appliedPartitioning ? await getDeviceTree({ partitioning: appliedPartitioning }) : "";
            setDeviceTreePath(_deviceTreePath);
        };
        _getDeviceTree();
    }, [appliedPartitioning, deviceTrees]);

    return deviceTrees[deviceTreePath];
};

export const useOriginalDeviceTree = () => {
    const { deviceTrees } = useContext(StorageContext);

    return deviceTrees[""];
};

export const usePlannedActions = () => {
    const plannedDeviceTree = useDeviceTree();

    return plannedDeviceTree ? plannedDeviceTree.actions : [];
};

export const usePlannedDevices = () => {
    const plannedDeviceTree = useDeviceTree();

    return plannedDeviceTree ? plannedDeviceTree.devices : {};
};

export const usePlannedExistingSystems = () => {
    const plannedDeviceTree = useDeviceTree();

    return plannedDeviceTree ? plannedDeviceTree.existingSystems : [];
};

export const usePlannedMountPoints = () => {
    const plannedDeviceTree = useDeviceTree();

    return plannedDeviceTree ? plannedDeviceTree.mountPoints : [];
};

export const useOriginalExistingSystems = () => {
    const originalDeviceTree = useOriginalDeviceTree();

    return originalDeviceTree ? originalDeviceTree.existingSystems : [];
};

export const useOriginalDevices = () => {
    const originalDeviceTree = useOriginalDeviceTree();

    return originalDeviceTree ? originalDeviceTree.devices : {};
};

/**
 * Hook that returns a callback to launch the storage editor.
 * Sets up the cockpit_anaconda sessionStorage data and triggers setShowStorage.
 */
export const useLaunchStorageEditor = ({ setShowStorage }) => {
    const targetSystemRoot = useContext(TargetSystemRootContext);
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const mountPointConstraints = useMountPointConstraints();

    const launchStorageEditor = useMemo(() => {
        const availableDevices = [
            ...diskSelection.selectedDisks,
            ...diskSelection.selectedDisks.map(disk => getDeviceAncestors(devices, disk)).flat(),
        ];
        const isEfi = mountPointConstraints?.some(c => c["required-filesystem-type"]?.v === "efi");
        const cockpitAnaconda = JSON.stringify({
            available_devices: availableDevices.map(device => devices[device]?.path.v).filter(Boolean),
            efi: isEfi,
            mount_point_prefix: targetSystemRoot,
        });

        return () => {
            window.sessionStorage.setItem("cockpit_anaconda", cockpitAnaconda);
            setShowStorage(true);
        };
    }, [devices, diskSelection.selectedDisks, mountPointConstraints, setShowStorage, targetSystemRoot]);

    return launchStorageEditor;
};
