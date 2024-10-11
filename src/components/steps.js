import cockpit from "cockpit";

import { Page as PageProgress } from "./installation/InstallationProgress.jsx";
import { Page as PageInstallationLanguage } from "./localization/InstallationLanguage.jsx";
import { Page as PageReviewConfiguration } from "./review/ReviewConfiguration.jsx";
import { Page as PageDiskEncryption } from "./storage/DiskEncryption.jsx";
import { Page as PageInstallationMethod } from "./storage/InstallationMethod.jsx";
import { Page as PageMountPointMapping } from "./storage/MountPointMapping.jsx";
import { Page as PageAccounts } from "./users/Accounts.jsx";

const _ = cockpit.gettext;

export const getSteps = (...args) => {
    const diskConfigurationSteps = [
        new PageMountPointMapping(...args),
        new PageDiskEncryption(...args),
    ];
    const stepsOrder = [
        new PageInstallationLanguage(...args),
        new PageInstallationMethod(...args),
        {
            id: "disk-configuration",
            isHidden: diskConfigurationSteps.every(step => step.isHidden),
            label: _("Disk configuration"),
            steps: diskConfigurationSteps,
        },
        new PageAccounts(...args),
        new PageReviewConfiguration(...args),
        new PageProgress(...args),
    ];
    return stepsOrder;
};
