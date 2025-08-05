import { useEffect, useState } from "react";

import { scenarioEraseAll } from "./erase-all/EraseAll.jsx";
import { scenarioMountPointMapping } from "./mount-point-mapping/MountPointMapping.jsx";
import { scenarioReinstallFedora } from "./reinstall-fedora/ReinstallFedora.jsx";
import { scenarioConfiguredStorage } from "./use-configured-storage/UseConfiguredStorage.jsx";
import { scenarioUseFreeSpace } from "./use-free-space/UseFreeSpace.jsx";

export const useScenariosAvailability = () => {
    const scenarioReinstallFedoraAvailability = scenarioReinstallFedora.getAvailability();
    const scenarioUseFreeSpaceAvailability = scenarioUseFreeSpace.getAvailability();
    const scenarioEraseAllAvailability = scenarioEraseAll.getAvailability();
    const scenarioMountPointMappingAvailability = scenarioMountPointMapping.getAvailability();
    const scenarioConfiguredStorageAvailability = scenarioConfiguredStorage.getAvailability();
    const [scenarioAvailability, setScenarioAvailability] = useState();

    useEffect(() => {
        setScenarioAvailability({
            [scenarioConfiguredStorage.id]: scenarioConfiguredStorageAvailability,
            [scenarioEraseAll.id]: scenarioEraseAllAvailability,
            [scenarioMountPointMapping.id]: scenarioMountPointMappingAvailability,
            [scenarioReinstallFedora.id]: scenarioReinstallFedoraAvailability,
            [scenarioUseFreeSpace.id]: scenarioUseFreeSpaceAvailability,
        });
    }, [
        scenarioConfiguredStorageAvailability,
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
];
