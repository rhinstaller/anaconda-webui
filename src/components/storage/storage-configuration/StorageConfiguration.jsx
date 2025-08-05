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

import cockpit from "cockpit";

import React, { useContext, useEffect, useMemo } from "react";
import { useWizardFooter } from "@patternfly/react-core";

import { applyStorage } from "../../../apis/storage_partitioning.js";

import { StorageContext } from "../../../contexts/Common.jsx";

import { usePartitioningReset } from "../../../hooks/Storage.jsx";

import { AnacondaWizardFooter } from "../../AnacondaWizardFooter.jsx";
import { DiskEncryption } from "./DiskEncryption.jsx";

const _ = cockpit.gettext;

const StorageConfiguration = ({ dispatch, setIsFormValid, setStepNotification }) => {
    const { luks, partitioning } = useContext(StorageContext);

    // Display custom footer
    const getFooter = useMemo(
        () =>
            <CustomFooter
              luks={luks}
              partitioning={partitioning.path}
              setStepNotification={setStepNotification}
            />,
        [luks, partitioning.path, setStepNotification]
    );

    useWizardFooter(getFooter);

    useEffect(() => {
        setIsFormValid(!luks.encrypted);
    }, [setIsFormValid, luks.encrypted]);

    return (
        <DiskEncryption
          dispatch={dispatch}
          setIsFormValid={setIsFormValid}
        />
    );
};

const CustomFooter = ({ luks, partitioning, setStepNotification }) => {
    const step = new Page().id;
    const onNext = ({ goToNextStep, setIsFormDisabled }) => {
        setIsFormDisabled(true);
        return applyStorage({
            luks,
            onFail: ex => {
                setIsFormDisabled(false);
                setStepNotification({ step, ...ex });
            },
            onSuccess: () => {
                goToNextStep();

                // Reset the state after the onNext call. Otherwise,
                // React will try to render the current step again.
                setIsFormDisabled(false);
                setStepNotification();
            },
            partitioning,
        });
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};

export class Page {
    constructor (isBootIso, storageScenarioId) {
        this.component = StorageConfiguration;
        this.id = "anaconda-screen-storage-configuration";
        this.isHidden = ["mount-point-mapping", "use-configured-storage", "home-reuse"].includes(storageScenarioId);
        this.label = _("Storage configuration");
        this.title = _("Storage configuration");
        /* Reset partitioning on page load to prevent stacking planned changes */
        this.usePageInit = usePartitioningReset;
    }
}
