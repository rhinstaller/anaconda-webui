import { useEffect, useState } from "react";

import { scenarioEraseAll } from "./EraseAll.jsx";
import { scenarioMountPointMapping } from "./MountPointMapping.jsx";
import { scenarioReinstallFedora } from "./ReinstallFedora.jsx";
import { scenarioConfiguredStorage } from "./UseConfiguredStorage.jsx";
import { scenarioUseFreeSpace } from "./UseFreeSpace.jsx";

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
