/*
 * Copyright (C) 2023 Red Hat, Inc.
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
    useOriginalDeviceTree,
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
    const { mountPoints } = useOriginalDeviceTree();
    const { storageScenarioId } = useContext(StorageContext);
    const scenarioAvailability = useScenariosAvailability();
    const scenarioAvailabilityLoading = scenarioAvailability === undefined;

    useEffect(() => {
        let selectedScenarioId = "";

        if (scenarioAvailabilityLoading) {
            return;
        }

        // If we detect mount points, there is an still an applied partitioning
        // and we should wait for the reset to take effect in the backend before deciding on the
        // selected scenario
        if (Object.keys(mountPoints).length > 0 && storageScenarioId !== "use-configured-storage") {
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
    }, [dispatch, mountPoints, scenarioAvailability, scenarioAvailabilityLoading, storageScenarioId]);

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
        setIsScenarioValid(!noScenariosAvailable);
    }, [noScenariosAvailable, setIsScenarioValid]);

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
