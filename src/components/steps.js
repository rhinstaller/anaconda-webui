import cockpit from "cockpit";

import { usePage as pageInstallationLanguage } from "./localization/InstallationLanguage.jsx";
import { usePage as pageReviewConfiguration } from "./review/ReviewConfiguration.jsx";
import { usePage as pageDiskEncryption } from "./storage/DiskEncryption.jsx";
import { usePage as pageInstallationMethod } from "./storage/InstallationMethod.jsx";
import { usePage as pageMountPointMapping } from "./storage/MountPointMapping.jsx";
import { usePage as pageAccounts } from "./users/Accounts.jsx";

const _ = cockpit.gettext;

export const getSteps = () => {
    const stepsOrder = [
        pageInstallationLanguage(),
        pageInstallationMethod(),
        {
            id: "disk-configuration",
            label: _("Disk configuration"),
            steps: [
                pageMountPointMapping(),
                pageDiskEncryption()
            ]
        },
        pageAccounts(),
        pageReviewConfiguration()
    ];
    return stepsOrder.filter(step => !step.isHidden);
};
