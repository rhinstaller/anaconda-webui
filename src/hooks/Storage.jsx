/*
 * Copyright (C) 2024 Red Hat, Inc.
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
import { useContext, useEffect, useMemo, useRef, useState } from "react";

import {
    getRequiredSpace
} from "../apis/payloads.js";
import {
    getDiskFreeSpace,
    getDiskTotalSpace,
    getFormatTypeData,
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

import { getDeviceAncestors, hasReusableFedoraWithWindowsOS } from "../helpers/storage.js";

import { FooterContext, StorageContext, StorageDefaultsContext } from "../contexts/Common.jsx";

import { scenarios } from "../components/storage/scenarios/index.js";

export const useDiskTotalSpace = () => {
    const [diskTotalSpace, setDiskTotalSpace] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    useEffect(() => {
        const update = async () => {
            const diskTotalSpace = await getDiskTotalSpace({ diskNames: selectedDisks });

            setDiskTotalSpace(diskTotalSpace);
        };
        update();
    }, [selectedDisks, devices]);

    return diskTotalSpace;
};

export const useDiskFreeSpace = () => {
    const [diskFreeSpace, setDiskFreeSpace] = useState();

    const devices = useOriginalDevices();
    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    useEffect(() => {
        const update = async () => {
            const diskFreeSpace = await getDiskFreeSpace({ diskNames: selectedDisks });

            setDiskFreeSpace(diskFreeSpace);
        };
        update();
    }, [selectedDisks, devices]);

    return diskFreeSpace;
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

    useEffect(() => {
        const update = async () => {
            let _mountPointConstraints = await getMountPointConstraints({ diskNames: selectedDisks });
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
    }, [selectedDisks, devices]);

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
    const { setIsFormDisabled } = useContext(FooterContext);
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const pageHasMounted = useRef(false);
    // Always reset the partitioning when entering the installation destination page
    // If the last partitioning applied was from the cockpit storage integration
    // we should not reset it, as this option does apply the partitioning onNext
    const needsReset = partitioning.storageScenarioId !== "use-configured-storage" &&
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
