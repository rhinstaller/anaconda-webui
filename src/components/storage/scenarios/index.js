import { scenarioEraseAll } from "./EraseAll.jsx";
import { scenarioMountPointMapping } from "./MountPointMapping.jsx";
import { scenarioReinstallFedora } from "./ReinstallFedora.jsx";
import { scenarioConfiguredStorage } from "./UseConfiguredStorage.jsx";
import { scenarioUseFreeSpace } from "./UseFreeSpace.jsx";

export const scenarios = [
    scenarioReinstallFedora,
    scenarioUseFreeSpace,
    scenarioEraseAll,
    scenarioMountPointMapping,
    scenarioConfiguredStorage,
];
