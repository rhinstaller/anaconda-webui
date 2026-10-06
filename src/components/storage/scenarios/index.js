/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { useEffect, useState } from "react";

import { scenario as scenarioEraseAll } from "./erase-all/index.js";
import { scenario as scenarioMountPointMapping } from "./mount-point-mapping/index.js";
import { scenario as scenarioReinstallFedora } from "./reinstall-fedora/index.js";
import {
    scenario as scenarioConfiguredStorage,
    scenarioKickstart as scenarioConfiguredStorageKickstart,
} from "./use-configured-storage/index.js";
import { scenario as scenarioUseFreeSpace } from "./use-free-space/index.js";

export const useScenariosAvailability = () => {
    const scenarioReinstallFedoraAvailability = scenarioReinstallFedora.getAvailability();
    const scenarioUseFreeSpaceAvailability = scenarioUseFreeSpace.getAvailability();
    const scenarioEraseAllAvailability = scenarioEraseAll.getAvailability();
    const scenarioMountPointMappingAvailability = scenarioMountPointMapping.getAvailability();
    const scenarioConfiguredStorageAvailability = scenarioConfiguredStorage.getAvailability({ scenarioId: "use-configured-storage" });
    const scenarioConfiguredStorageKickstartAvailability = scenarioConfiguredStorageKickstart.getAvailability({ scenarioId: "use-configured-storage-kickstart" });
    const [scenarioAvailability, setScenarioAvailability] = useState();

    useEffect(() => {
        setScenarioAvailability({
            [scenarioConfiguredStorage.id]: scenarioConfiguredStorageAvailability,
            [scenarioConfiguredStorageKickstart.id]: scenarioConfiguredStorageKickstartAvailability,
            [scenarioEraseAll.id]: scenarioEraseAllAvailability,
            [scenarioMountPointMapping.id]: scenarioMountPointMappingAvailability,
            [scenarioReinstallFedora.id]: scenarioReinstallFedoraAvailability,
            [scenarioUseFreeSpace.id]: scenarioUseFreeSpaceAvailability,
        });
    }, [
        scenarioConfiguredStorageAvailability,
        scenarioConfiguredStorageKickstartAvailability,
        scenarioEraseAllAvailability,
        scenarioMountPointMappingAvailability,
        scenarioReinstallFedoraAvailability,
        scenarioUseFreeSpaceAvailability,
    ]);

    if (Object.values(scenarioAvailability || {}).some(value => value === undefined)) {
        return undefined;
    }

    return scenarioAvailability;
};

export const scenarios = [
    scenarioReinstallFedora,
    scenarioUseFreeSpace,
    scenarioEraseAll,
    scenarioMountPointMapping,
    scenarioConfiguredStorage,
    scenarioConfiguredStorageKickstart,
];
