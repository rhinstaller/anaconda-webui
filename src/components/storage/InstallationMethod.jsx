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

import {
    applyStorage,
    resetPartitioning,
} from "../../apis/storage_partitioning.js";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import {
    DialogsContext,
    FooterContext,
    OsReleaseContext,
    StorageContext,
    StorageDefaultsContext,
} from "../../contexts/Common.jsx";
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
    setStepNotification,
    showStorage,
}) => {
    const [isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked] = useState();

    // Display custom footer
    const getFooter = useMemo(() => (
        <CustomFooter
          isFormDisabled={isFormDisabled}
          isReclaimSpaceCheckboxChecked={isReclaimSpaceCheckboxChecked}
          setStepNotification={setStepNotification}
        />
    ), [isFormDisabled, isReclaimSpaceCheckboxChecked, setStepNotification]);
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
              onCritFail={onCritFail}
            />
            <DialogsContext.Provider value={{ isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked }}>
                <InstallationScenario
                  dispatch={dispatch}
                  idPrefix={idPrefix}
                  isFormDisabled={isFormDisabled}
                  onCritFail={onCritFail}
                  setIsFormValid={setIsFormValid}
                  showStorage={showStorage}
                />
            </DialogsContext.Provider>
        </Form>
    );
};

const CustomFooter = ({ isFormDisabled, isReclaimSpaceCheckboxChecked, setStepNotification }) => {
    const [isReclaimSpaceModalOpen, setIsReclaimSpaceModalOpen] = useState(false);
    const [isNextClicked, setIsNextClicked] = useState(false);
    const { goToNextStep } = useWizardContext();
    const [newPartitioning, setNewPartitioning] = useState(-1);
    const nextRef = useRef();
    const { partitioning, storageScenarioId } = useContext(StorageContext);
    const { defaultScheme } = useContext(StorageDefaultsContext);
    const method = ["mount-point-mapping", "use-configured-storage"].includes(storageScenarioId) ? "MANUAL" : "AUTOMATIC";

    useEffect(() => {
        if (nextRef.current !== true && newPartitioning === partitioning.path && isNextClicked) {
            nextRef.current = true;
            goToNextStep();
        }
    }, [isNextClicked, goToNextStep, newPartitioning, partitioning.path]);

    const onNext = async ({ setIsFormDisabled }) => {
        if (method === "MANUAL") {
            setNewPartitioning(partitioning.path);
            setIsNextClicked(true);
        } else {
            const part = await getNewPartitioning({
                autopartScheme: defaultScheme,
                currentPartitioning: partitioning,
                method,
                storageScenarioId,
            });
            setNewPartitioning(part);

            const scenarioSupportsReclaimSpace = scenarios.find(sc => sc.id === storageScenarioId)?.canReclaimSpace;
            const willShowReclaimSpaceModal = scenarioSupportsReclaimSpace && isReclaimSpaceCheckboxChecked;

            if (willShowReclaimSpaceModal) {
                setIsReclaimSpaceModalOpen(true);
            } else if (storageScenarioId !== "home-reuse") {
                setIsNextClicked(true);
            } else {
                setIsFormDisabled(true);
                const step = new Page().id;
                await applyStorage({
                    onFail: ex => {
                        console.error(ex);
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
                    partitioning: part,
                });
            }
        }
    };

    const reclaimSpaceModal = (
        <ReclaimSpaceModal
          isFormDisabled={isFormDisabled}
          onNext={goToNextStep}
          onClose={() => setIsReclaimSpaceModalOpen(false)}
        />
    );

    const hasNewPartitioning = newPartitioning === undefined || newPartitioning !== partitioning.path;
    if (hasNewPartitioning && isReclaimSpaceModalOpen) {
        return;
    }

    return (
        <>
            {isReclaimSpaceModalOpen ? reclaimSpaceModal : null}
            <AnacondaWizardFooter
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

const usePageInit = () => {
    const { setIsFormDisabled } = useContext(FooterContext);
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const pageHasMounted = useRef(false);
    // Always reset the partitioning when entering the installation destination page
    // If the last partitioning applied was from the cockpit storage integration
    // we should not reset it, as this option does apply the partitioning onNext
    const needsReset = partitioning.storageScenarioId !== "use-configured-storage" &&
        appliedPartitioning &&
        pageHasMounted.current !== true;

    useEffect(() => {
        pageHasMounted.current = true;
        if (needsReset) {
            resetPartitioning();
        } else {
            setIsFormDisabled(false);
        }
    }, [needsReset, setIsFormDisabled]);
};

const PageTitle = () => {
    const osRelease = useContext(OsReleaseContext);

    return cockpit.format(_("Welcome. Let's install $0 now."), osRelease.REDHAT_SUPPORT_PRODUCT);
};

export class Page {
    constructor (isBootIso) {
        this.component = InstallationMethod;
        this.id = "installation-method";
        this.label = _("Installation method");
        this.title = !isBootIso ? <PageTitle /> : null;
        this.usePageInit = usePageInit;
    }
}
