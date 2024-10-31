import cockpit from "cockpit";

import { Page as PageProgress } from "./installation/InstallationProgress.jsx";
import { Page as PageInstallationLanguage } from "./localization/InstallationLanguage.jsx";
import { Page as PageReviewConfiguration } from "./review/ReviewConfiguration.jsx";
import { Page as PageInstallationMethod } from "./storage/InstallationMethod.jsx";
import { Page as PageMountPointMapping } from "./storage/MountPointMapping.jsx";
import { Page as PageStorageConfiguration } from "./storage/StorageConfiguration.jsx";
import { Page as PageAccounts } from "./users/Accounts.jsx";

const _ = cockpit.gettext;

export const getSteps = (...args) => {
    const mountPointMappingStep = new PageMountPointMapping(...args);
    const stepsOrder = [
        new PageInstallationLanguage(...args),
        new PageInstallationMethod(...args),
        new PageStorageConfiguration(...args),
        {
            id: "storage-configuration-manual",
            isHidden: mountPointMappingStep.isHidden,
            label: _("Storage configuration"),
            steps: [mountPointMappingStep],
        },
        new PageAccounts(...args),
        new PageReviewConfiguration(...args),
        new PageProgress(...args),
    ];
    return stepsOrder;
};
