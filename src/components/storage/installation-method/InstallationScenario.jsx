/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { FormGroup, FormSection } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Radio } from "@patternfly/react-core/dist/esm/components/Radio/index.js";
import { Title } from "@patternfly/react-core/dist/esm/components/Title/index.js";

import { setStorageScenarioAction } from "../../../actions/storage-actions.js";

import {
    getLockedLUKSDevices,
} from "../../../helpers/storage.js";

import {
    StorageContext,
} from "../../../contexts/Common.jsx";

import {
    useOriginalDevices,
} from "../../../hooks/Storage.jsx";

import { StorageReview } from "../../review/StorageReview.jsx";
import { scenarios, useScenariosAvailability } from "../scenarios/index.js";
import { EncryptedDevices } from "./EncryptedDevices.jsx";

import "./InstallationScenario.scss";

const _ = cockpit.gettext;

export const useScenario = () => {
    const { storageScenarioId } = useContext(StorageContext);
    const [scenario, setScenario] = useState({});

    useEffect(() => {
        setScenario(scenarios.find(s => s.id === storageScenarioId) || {});
    }, [storageScenarioId]);

    return scenario;
};

const InstallationScenarioSelector = ({
    dispatch,
    idPrefix,
    isFormDisabled,
}) => {
    const { appliedPartitioning, storageScenarioId } = useContext(StorageContext);
    const scenarioAvailability = useScenariosAvailability();
    const scenarioAvailabilityLoading = scenarioAvailability === undefined;

    useEffect(() => {
        let selectedScenarioId = "";

        if (scenarioAvailabilityLoading) {
            return;
        }

        // If there is still an applied partitioning we should wait for the
        // reset to take effect in the backend before deciding on the selected scenario
        if (appliedPartitioning && storageScenarioId !== "use-configured-storage") {
            return;
        }

        if (storageScenarioId && !scenarioAvailability[storageScenarioId].hidden && scenarioAvailability[storageScenarioId].available) {
            selectedScenarioId = storageScenarioId;
        } else {
            selectedScenarioId = scenarios.find(scenario => (
                scenarioAvailability[scenario.id].available &&
                !scenarioAvailability[scenario.id].hidden
            ))?.id;
        }

        if (selectedScenarioId) {
            dispatch(setStorageScenarioAction(selectedScenarioId));
        }
    }, [appliedPartitioning, dispatch, scenarioAvailability, scenarioAvailabilityLoading, storageScenarioId]);

    const onScenarioToggled = (scenarioId) => {
        dispatch(setStorageScenarioAction(scenarioId));
    };

    if (scenarioAvailabilityLoading) {
        return null;
    }

    const scenarioItems = scenarios.filter(scenario => !scenarioAvailability[scenario.id].hidden).map(scenario => (
        <Radio
          className={idPrefix + "-scenario"}
          key={scenario.id}
          id={idPrefix + "-scenario-" + scenario.id}
          value={scenario.id}
          name={idPrefix + "-scenario"}
          label={scenario.getLabel()}
          isDisabled={!scenarioAvailability[scenario.id].available || isFormDisabled}
          isChecked={storageScenarioId === scenario.id}
          onChange={() => onScenarioToggled(scenario.id)}
          description={scenario.getDetail()}
          body={
              <>
                  {scenarioAvailability[scenario.id].reason &&
                  <span className={idPrefix + "-scenario-disabled-reason"}>
                      {scenarioAvailability[scenario.id].reason}
                  </span>}
                  <span className={idPrefix + "-scenario-disabled-shorthint"}>{scenarioAvailability[scenario.id].hint}</span>
                  {scenarioAvailability[scenario.id].showReview && <span className={idPrefix + "-scenario-review"}><StorageReview /></span>}
                  {scenario.action && <scenario.action availability={scenarioAvailability[scenario.id]} />}
              </>
          } />
    ));

    return scenarioItems;
};

export const InstallationScenario = ({
    dispatch,
    idPrefix,
    isFirstScreen,
    isFormDisabled,
    setIsScenarioValid,
}) => {
    const headingLevel = isFirstScreen ? "h3" : "h2";
    const { diskSelection, storageScenarioId } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const scenarioAvailability = useScenariosAvailability();
    const noScenariosAvailable = !Object.values(scenarioAvailability || {}).some(scenario => (
        scenario.available && !scenario.hidden
    ));

    const lockedLUKSDevices = useMemo(
        () => getLockedLUKSDevices(diskSelection.selectedDisks, devices),
        [devices, diskSelection.selectedDisks]
    );

    const showLuksUnlock = lockedLUKSDevices?.length > 0;

    useEffect(() => {
        setIsScenarioValid(!!storageScenarioId);
    }, [storageScenarioId, setIsScenarioValid]);

    if (noScenariosAvailable && !showLuksUnlock) {
        return null;
    }

    return (
        <FormSection
          title={<Title headingLevel={headingLevel}>{_("How would you like to install?")}</Title>}
        >
            <FormGroup className={idPrefix + "-scenario-group"} isStack data-scenario={storageScenarioId}>
                {showLuksUnlock &&
                (
                    <EncryptedDevices
                      dispatch={dispatch}
                      idPrefix={idPrefix}
                      lockedLUKSDevices={lockedLUKSDevices}
                    />
                )}
                <InstallationScenarioSelector
                  dispatch={dispatch}
                  idPrefix={idPrefix}
                  isFormDisabled={isFormDisabled}
                />
            </FormGroup>
        </FormSection>
    );
};
