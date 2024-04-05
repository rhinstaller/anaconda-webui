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

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { DialogsContext, FooterContext, OsReleaseContext, StorageContext, SystemTypeContext } from "../Common.jsx";
import { getNewPartitioning } from "./Common.jsx";
import { InstallationDestination } from "./InstallationDestination.jsx";
import { InstallationScenario, scenarios } from "./InstallationScenario.jsx";
import { ReclaimSpaceModal } from "./ReclaimSpaceModal.jsx";

const _ = cockpit.gettext;

const InstallationMethod = ({
    dispatch,
    idPrefix,
    isEfi,
    isFormDisabled,
    onCritFail,
    setIsFormDisabled,
    setIsFormValid,
    setShowStorage,
}) => {
    const [isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked] = useState();

    // Display custom footer
    const getFooter = useMemo(() => (
        <CustomFooter
          isReclaimSpaceCheckboxChecked={isReclaimSpaceCheckboxChecked}
        />
    ), [isReclaimSpaceCheckboxChecked]);
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
            <DialogsContext.Provider value={{ isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked }}>
                <InstallationScenario
                  dispatch={dispatch}
                  idPrefix={idPrefix}
                  isFormDisabled={isFormDisabled}
                  onCritFail={onCritFail}
                  setIsFormValid={setIsFormValid}
                />
            </DialogsContext.Provider>
        </Form>
    );
};

const CustomFooter = ({ isReclaimSpaceCheckboxChecked }) => {
    const [isReclaimSpaceModalOpen, setIsReclaimSpaceModalOpen] = useState(false);
    const { goToNextStep } = useWizardContext();
    const [newPartitioning, setNewPartitioning] = useState();
    const [onNextClicked, setOnNextClicked] = useState();
    const { partitioning, storageScenarioId } = useContext(StorageContext);
    const method = ["mount-point-mapping", "use-configured-storage"].includes(storageScenarioId) ? "MANUAL" : "AUTOMATIC";

    useEffect(() => {
        if (onNextClicked && newPartitioning === partitioning.path) {
            const scenarioSupportsReclaimSpace = scenarios.find(sc => sc.id === storageScenarioId).canReclaimSpace;

            if (!scenarioSupportsReclaimSpace || !isReclaimSpaceCheckboxChecked) {
                goToNextStep();
                setOnNextClicked(false);
            } else {
                setIsReclaimSpaceModalOpen(true);
            }
        }
    }, [goToNextStep, newPartitioning, onNextClicked, partitioning.path, isReclaimSpaceCheckboxChecked, storageScenarioId]);

    const onNext = async () => {
        if (method === "MANUAL") {
            goToNextStep();
        } else {
            const part = await getNewPartitioning({ method });
            setNewPartitioning(part);
        }
        setOnNextClicked(true);
    };

    const reclaimSpaceModal = (
        <ReclaimSpaceModal
          onNext={goToNextStep}
          onClose={() => setIsReclaimSpaceModalOpen(false)}
        />
    );

    return (
        <>
            {isReclaimSpaceModalOpen ? reclaimSpaceModal : null}
            <AnacondaWizardFooter
              currentStepProps={usePage()}
              footerHelperText={<InstallationMethodFooterHelper />}
              onNext={onNext}
            />
        </>
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
