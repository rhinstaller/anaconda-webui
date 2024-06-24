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

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
    Form,
    HelperText,
    HelperTextItem,
    useWizardContext,
    useWizardFooter,
} from "@patternfly/react-core";

import { getAppliedPartitioning, resetPartitioning } from "../../apis/storage_partitioning.js";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { FooterContext, OsReleaseContext, StorageContext, SystemTypeContext } from "../Common.jsx";
import { CockpitStorageIntegration } from "./CockpitStorageIntegration.jsx";
import { getNewPartitioning } from "./Common.jsx";
import { InstallationDestination } from "./InstallationDestination.jsx";
import { InstallationScenario } from "./InstallationScenario.jsx";

const _ = cockpit.gettext;

const InstallationMethod = ({
    dispatch,
    idPrefix,
    isEfi,
    isFormDisabled,
    onCritFail,
    setIsFormDisabled,
    setIsFormValid,
}) => {
    const [showStorage, setShowStorage] = useState(false);
    const { partitioning } = useContext(StorageContext);

    // Display custom footer
    const getFooter = useMemo(() => (
        <CustomFooter />
    ), []);
    useWizardFooter(getFooter);

    useEffect(() => {
        // Always reset the partitioning when entering the installation destination page
        const resetPartitioningAsync = async () => {
            const appliedPartitioning = await getAppliedPartitioning();
            if (appliedPartitioning) {
                await resetPartitioning();
            }
            setIsFormDisabled(false);
        };

        // If the last partitioning applied was from the cockpit storage integration
        // we should not reset it, as this option does apply the partitioning onNext
        if (partitioning.storageScenarioId !== "use-configured-storage") {
            resetPartitioningAsync();
        } else {
            setIsFormDisabled(false);
        }
    }, [setIsFormDisabled, partitioning.storageScenarioId]);

    return (
        <Form
          className={idPrefix + "-selector"}
          id={idPrefix + "-selector-form"}
          onSubmit={e => { e.preventDefault(); return false }}
        >
            <CockpitStorageIntegration
              dispatch={dispatch}
              isFormDisabled={isFormDisabled}
              onCritFail={onCritFail}
              setShowStorage={setShowStorage}
              showStorage={showStorage}
            />
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
              setIsFormValid={setIsFormValid}
              showStorage={showStorage}
            />
        </Form>
    );
};

const CustomFooter = () => {
    const { goToNextStep } = useWizardContext();
    const [newPartitioning, setNewPartitioning] = useState(-1);
    const nextRef = useRef();
    const { partitioning, storageScenarioId } = useContext(StorageContext);
    const method = ["mount-point-mapping", "use-configured-storage"].includes(storageScenarioId) ? "MANUAL" : "AUTOMATIC";

    useEffect(() => {
        if (nextRef.current !== true && newPartitioning === partitioning.path) {
            nextRef.current = true;
            goToNextStep();
        }
    }, [goToNextStep, newPartitioning, partitioning.path, storageScenarioId]);

    const onNext = async () => {
        if (method === "MANUAL") {
            setNewPartitioning(partitioning.path);
        } else {
            const part = await getNewPartitioning({ currentPartitioning: partitioning, method, storageScenarioId });
            setNewPartitioning(part);
        }
    };

    return (
        <AnacondaWizardFooter
          currentStepProps={usePage()}
          footerHelperText={<InstallationMethodFooterHelper />}
          onNext={onNext}
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
