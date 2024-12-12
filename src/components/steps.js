import cockpit from "cockpit";

import { debug } from "../helpers/log.js";

import { Page as PageProgress } from "./installation/InstallationProgress.jsx";
import { Page as PageInstallationLanguage } from "./localization/InstallationLanguage.jsx";
import { Page as PageReviewConfiguration } from "./review/ReviewConfiguration.jsx";
import { Page as PageInstallationMethod } from "./storage/InstallationMethod.jsx";
import { Page as PageMountPointMapping } from "./storage/MountPointMapping.jsx";
import { Page as PageStorageConfiguration } from "./storage/StorageConfiguration.jsx";
import { Page as PageAccounts } from "./users/Accounts.jsx";

const _ = cockpit.gettext;

export const getSteps = (userInterfaceConfig, ...args) => {
    const mountPointMappingStep = new PageMountPointMapping(...args);
    const hiddenScreens = userInterfaceConfig.hidden_screens || [];
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

    /* Screens can be hidden in two ways:
     * 1. Dynamically: Controlled by the 'Page.isHidden' method in individual components,
     *    e.g., see 'MountPointMapping.jsx'.
     * 2. Statically: Configured via the 'hidden_screens' key in the 'anaconda.conf'
     *    For example, the 'Account Creation' screen is hidden in the 'Workstation' ISO
     *    because this step is handled by the 'Gnome Initial Setup' tool during the first boot.
     */
    return stepsOrder
            .filter(s => {
                const isHidden = hiddenScreens.includes(s.id);

                if (isHidden) {
                    debug(
                        `Screen '${s.id}' will not be displayed because it is hidden by the Anaconda configuration file.`
                    );
                }

                return !isHidden;
            })
            .map((s, i) => {
                if (i === 0) {
                    s.isFirstScreen = true;
                }
                return s;
            });
};
