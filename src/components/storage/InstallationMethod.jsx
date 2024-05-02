/*
 * Copyright (C) 2022 Red Hat, Inc.
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

import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    Form,
    HelperText,
    HelperTextItem,
    useWizardContext,
    useWizardFooter,
} from "@patternfly/react-core";

import { setBootloaderDrive } from "../../apis/storage_bootloader.js";
import { setInitializationMode, setInitializeLabelsEnabled } from "../../apis/storage_disk_initialization.js";
import { createPartitioning } from "../../apis/storage_partitioning.js";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { FooterContext, OsReleaseContext, StorageContext, SystemTypeContext } from "../Common.jsx";
import { InstallationDestination } from "./InstallationDestination.jsx";
import { InstallationScenario, scenarios } from "./InstallationScenario.jsx";

const _ = cockpit.gettext;

const InstallationMethod = ({
    dispatch,
    idPrefix,
    isEfi,
    isFormDisabled,
    onCritFail,
    reusePartitioning,
    scenarioPartitioningMapping,
    setIsFormDisabled,
    setIsFormValid,
    setReusePartitioning,
    setShowStorage,
}) => {
    // Display custom footer
    const getFooter = useMemo(() => (
        <CustomFooter
          reusePartitioning={reusePartitioning}
          setReusePartitioning={setReusePartitioning}
        />
    ), [reusePartitioning, setReusePartitioning]);
    useWizardFooter(getFooter);

    return (
        <Form
          className={idPrefix + "-selector"}
          id={idPrefix + "-selector-form"}
          onSubmit={e => { e.preventDefault(); return false }}
        >
            <InstallationDestination
              isEfi={isEfi}
              dispatch={dispatch}
              idPrefix={idPrefix}
              isFormDisabled={isFormDisabled}
              setIsFormValid={setIsFormValid}
              setIsFormDisabled={setIsFormDisabled}
              setShowStorage={setShowStorage}
              onCritFail={onCritFail}
            />
            <InstallationScenario
              dispatch={dispatch}
              idPrefix={idPrefix}
              isFormDisabled={isFormDisabled}
              onCritFail={onCritFail}
              scenarioPartitioningMapping={scenarioPartitioningMapping}
              setIsFormValid={setIsFormValid}
            />
        </Form>
    );
};

const CustomFooter = ({ reusePartitioning, setReusePartitioning }) => {
    const [newPartitioning, setNewPartitioning] = useState();
    const [onNextClicked, setOnNextClicked] = useState();
    const { partitioning, storageScenarioId } = useContext(StorageContext);
    const { goToNextStep } = useWizardContext();
    const method = storageScenarioId === "mount-point-mapping" ? "MANUAL" : "AUTOMATIC";
    const scenario = scenarios.find(s => s.id === storageScenarioId);

    const onNext = async () => {
        // For automatic partitioning let's always create a new partitioning
        // This is for simplicity, can be revisited later
        if (method === "AUTOMATIC" || !reusePartitioning || partitioning.method !== method) {
            await setInitializationMode({ mode: scenario.initializationMode });
            await setInitializeLabelsEnabled({ enabled: true });
            await setBootloaderDrive({ drive: "" });
            const part = await createPartitioning({ method });

            setReusePartitioning(true);
            setNewPartitioning(part);
        } else {
            setNewPartitioning(partitioning.path);
        }
        setOnNextClicked(true);
    };

    useEffect(() => {
        if (onNextClicked && newPartitioning === partitioning.path) {
            goToNextStep();
            setOnNextClicked(false);
        }
    }, [goToNextStep, newPartitioning, onNextClicked, partitioning.path]);

    return (
        <AnacondaWizardFooter
          onNext={onNext}
          footerHelperText={<InstallationMethodFooterHelper />}
        />
    );
};

const InstallationMethodFooterHelper = () => {
    const { isFormValid } = useContext(FooterContext);

    if (isFormValid) {
        return null;
    }

    return (
        <HelperText id="next-helper-text">
            <HelperTextItem
              variant="indeterminate">
                {_("To continue, select the devices to install to.")}
            </HelperTextItem>
        </HelperText>
    );
};

export const usePage = () => {
    const osRelease = useContext(OsReleaseContext);
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    return ({
        component: InstallationMethod,
        id: "installation-method",
        label: _("Installation method"),
        title: !isBootIso ? cockpit.format(_("Welcome. Let's install $0 now."), osRelease.REDHAT_SUPPORT_PRODUCT) : null,
    });
};
