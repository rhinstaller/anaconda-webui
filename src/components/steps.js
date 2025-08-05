import cockpit from "cockpit";

import { debug } from "../helpers/log.js";

import { Page as PageDateAndTime } from "./datetime/index.js";
import { Page as PageProgress } from "./installation/index.js";
import { Page as PageInstallationLanguage } from "./localization/index.js";
import { Page as PageReviewConfiguration } from "./review/index.js";
import { Page as PageInstallationMethod } from "./storage/installation-method/index.js";
import { Page as PageMountPointMapping } from "./storage/mount-point-mapping/index.js";
import { Page as PageStorageConfiguration } from "./storage/storage-configuration/index.js";
import { Page as PageAccounts } from "./users/index.js";

const _ = cockpit.gettext;

export const getSteps = (userInterfaceConfig, ...args) => {
    const mountPointMappingStep = new PageMountPointMapping(...args);
    const hiddenScreens = userInterfaceConfig.hidden_webui_pages || [];
    const stepsOrder = [
        new PageInstallationLanguage(...args),
        new PageDateAndTime(...args),
        new PageInstallationMethod(...args),
        new PageStorageConfiguration(...args),
        {
            id: "anaconda-screen-storage-configuration-manual",
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
     * 2. Statically: Configured via the 'hidden_webui_pages' key in the 'anaconda.conf'
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
