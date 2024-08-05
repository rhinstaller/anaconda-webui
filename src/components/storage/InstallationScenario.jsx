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

import React, { useContext, useEffect, useState } from "react";
import {
    Checkbox,
    FormGroup,
    Radio,
    Title,
} from "@patternfly/react-core";

import { setStorageScenarioAction } from "../../actions/storage-actions.js";

import { debug } from "../../helpers/log.js";

import { DialogsContext, StorageContext, SystemTypeContext } from "../Common.jsx";
import { StorageReview } from "../review/StorageReview.jsx";
import {
    useDiskFreeSpace,
    useDiskTotalSpace,
    useDuplicateDeviceNames,
    useMountPointConstraints,
    useOriginalDeviceTree,
    useRequiredSize,
    useUsablePartitions,
} from "./Common.jsx";
import { helpConfiguredStorage, helpEraseAll, helpMountPointMapping, helpUseFreeSpace } from "./HelpAutopartOptions.jsx";

import "./InstallationScenario.scss";

const _ = cockpit.gettext;

function AvailabilityState (available = false, hidden = true, reason = null, hint = null, enforceAction = false) {
    this.available = available;
    this.enforceAction = enforceAction;
    this.hidden = hidden;
    this.reason = reason;
    this.hint = hint;
}

const checkEraseAll = ({ diskTotalSpace, requiredSize, selectedDisks }) => {
    const availability = new AvailabilityState();

    availability.available = !!selectedDisks.length;
    availability.hidden = false;

    if (diskTotalSpace < requiredSize) {
        availability.available = false;
        availability.reason = _("Not enough space on selected disks.");
        availability.hint = cockpit.format(_(
            "The installation needs $1 of disk space; " +
            "however, the capacity of the selected disks is only $0."
        ), cockpit.format_bytes(diskTotalSpace), cockpit.format_bytes(requiredSize));
    }

    return availability;
};

export const checkUseFreeSpace = ({ diskFreeSpace, diskTotalSpace, requiredSize, selectedDisks }) => {
    const availability = new AvailabilityState();

    availability.hidden = false;
    availability.available = !!selectedDisks.length;

    if (diskFreeSpace > 0 && diskTotalSpace > 0) {
        availability.hidden = diskFreeSpace === diskTotalSpace;
    }
    if (diskFreeSpace < requiredSize) {
        availability.enforceAction = true;
        availability.reason = _("Not enough free space on the selected disks.");
        availability.hint = cockpit.format(
            _("To use this option, resize or remove existing partitions to free up at least $0."),
            cockpit.format_bytes(requiredSize)
        );
    }
    return availability;
};

const getMissingNonmountablePartitions = (usablePartitions, mountPointConstraints) => {
    const existingNonmountablePartitions = usablePartitions
            .filter(device => !device.formatData.mountable.v)
            .map(device => device.formatData.type.v);

    const missingNonmountablePartitions = mountPointConstraints.filter(constraint =>
        constraint.required.v &&
        !constraint["mount-point"].v &&
        !existingNonmountablePartitions.includes(constraint["required-filesystem-type"].v))
            .map(constraint => constraint.description);

    return missingNonmountablePartitions;
};

const checkMountPointMapping = ({ duplicateDeviceNames, mountPointConstraints, selectedDisks, usablePartitions }) => {
    const availability = new AvailabilityState();

    availability.hidden = false;
    availability.available = !!selectedDisks.length;

    const missingNMParts = getMissingNonmountablePartitions(usablePartitions, mountPointConstraints);
    const hasFilesystems = usablePartitions
            .filter(device => device.formatData.mountable.v || device.formatData.type.v === "luks").length > 0;

    if (!hasFilesystems) {
        availability.available = false;
        availability.reason = _("No usable devices on the selected disks.");
    } else if (missingNMParts.length) {
        availability.available = false;
        availability.reason = cockpit.format(_("Some required partitions are missing: $0"), missingNMParts.join(", "));
    } else if (duplicateDeviceNames.length) {
        availability.available = false;
        availability.reason = cockpit.format(_("Some devices use the same name: $0."), duplicateDeviceNames.join(", "));
        availability.hint = _("To use this option, rename devices to have unique names.");
    }
    return availability;
};

export const checkConfiguredStorage = ({
    devices,
    mountPointConstraints,
    newMountPoints,
    partitioning,
    storageScenarioId,
}) => {
    const availability = new AvailabilityState();

    const currentPartitioningMatches = storageScenarioId === "use-configured-storage";
    availability.hidden = partitioning === undefined || !currentPartitioningMatches;

    availability.available = (
        newMountPoints === undefined ||
        (
            mountPointConstraints
                    ?.filter(m => m.required.v)
                    .every(m => {
                        const allDirs = [];
                        const getNestedDirs = (object) => {
                            if (!object) {
                                return;
                            }
                            const { content, dir, subvolumes } = object;

                            if (dir) {
                                allDirs.push(dir);
                            }
                            if (content) {
                                getNestedDirs(content);
                            }
                            if (subvolumes) {
                                Object.keys(subvolumes).forEach(sv => getNestedDirs(subvolumes[sv]));
                            }
                        };

                        if (m["mount-point"].v) {
                            Object.keys(newMountPoints).forEach(key => getNestedDirs(newMountPoints[key]));

                            return allDirs.includes(m["mount-point"].v);
                        }

                        if (m["required-filesystem-type"].v === "biosboot") {
                            const biosboot = Object.keys(devices).find(d => devices[d].formatData.type.v === "biosboot");

                            return biosboot !== undefined;
                        }

                        return false;
                    })
        )
    );

    availability.review = <StorageReview />;

    return availability;
};

const ReclaimSpace = ({ availability }) => {
    const { isReclaimSpaceCheckboxChecked, setIsReclaimSpaceCheckboxChecked } = useContext(DialogsContext);

    useEffect(() => {
        setIsReclaimSpaceCheckboxChecked(availability.enforceAction);
    }, [availability.enforceAction, setIsReclaimSpaceCheckboxChecked]);

    return (
        <Checkbox
          id="reclaim-space-checkbox"
          isChecked={isReclaimSpaceCheckboxChecked}
          isDisabled={availability.enforceAction}
          label={!availability.enforceAction ? _("Reclaim additional space") : _("Reclaim space (required)")}
          name="reclaim-space"
          onChange={(_, value) => setIsReclaimSpaceCheckboxChecked(value)}
        />
    );
};

export const scenarios = [{
    buttonLabel: _("Erase data and install"),
    buttonVariant: "danger",
    check: checkEraseAll,
    default: true,
    detail: helpEraseAll,
    dialogTitleIconVariant: "warning",
    dialogWarning: _("The selected disks will be erased, this cannot be undone. Are you sure you want to continue with the installation?"),
    dialogWarningTitle: _("Erase data and install?"),
    id: "erase-all",
    // CLEAR_PARTITIONS_ALL = 1
    initializationMode: 1,
    label: _("Erase data and install"),
    screenWarning: _("Erasing the data cannot be undone. Be sure to have backups."),
}, {
    action: ReclaimSpace,
    buttonLabel: _("Install"),
    buttonVariant: "primary",
    canReclaimSpace: true,
    check: checkUseFreeSpace,
    default: false,
    detail: helpUseFreeSpace,
    dialogTitleIconVariant: "",
    dialogWarning: _("The installation will use the available space on your devices and will not erase any device data."),
    dialogWarningTitle: _("Install on the free space?"),
    id: "use-free-space",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    label: _("Use free space for the installation"),
    screenWarning: _("To prevent loss, make sure to backup your data."),
}, {
    buttonLabel: _("Apply mount point assignment and install"),
    buttonVariant: "danger",
    check: checkMountPointMapping,
    default: false,
    detail: helpMountPointMapping,
    dialogTitleIconVariant: "",
    dialogWarning: _("The installation will use your configured partitioning layout."),
    dialogWarningTitle: _("Install on the custom mount points?"),
    id: "mount-point-mapping",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    label: _("Mount point assignment"),
    screenWarning: _("To prevent loss, make sure to backup your data."),
}, {
    buttonLabel: _("Install"),
    buttonVariant: "danger",
    check: checkConfiguredStorage,
    default: false,
    detail: helpConfiguredStorage,
    dialogTitleIconVariant: "",
    dialogWarning: _("The installation will use your configured partitioning layout."),
    dialogWarningTitle: _("Install using the configured storage?"),
    id: "use-configured-storage",
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    label: _("Use configured storage"),
    screenWarning: _("To prevent loss, make sure to backup your data."),
}
];

export const useScenario = () => {
    const { storageScenarioId } = useContext(StorageContext);
    const [scenario, setScenario] = useState({});

    useEffect(() => {
        setScenario(scenarios.find(s => s.id === storageScenarioId) || {});
    }, [storageScenarioId]);

    return scenario;
};

export const getDefaultScenario = () => {
    return scenarios.filter(s => s.default)[0];
};

const InstallationScenarioSelector = ({
    dispatch,
    idPrefix,
    isFormDisabled,
    setIsFormValid,
    showStorage,
}) => {
    const { diskSelection, partitioning } = useContext(StorageContext);
    const { deviceNames, devices, mountPoints } = useOriginalDeviceTree();
    const selectedDisks = diskSelection.selectedDisks;
    const [scenarioAvailability, setScenarioAvailability] = useState(Object.fromEntries(
        scenarios.map((s) => [s.id, new AvailabilityState()])
    ));
    const diskTotalSpace = useDiskTotalSpace({ devices, selectedDisks });
    const diskFreeSpace = useDiskFreeSpace({ devices, selectedDisks });
    const duplicateDeviceNames = useDuplicateDeviceNames({ deviceNames });
    const mountPointConstraints = useMountPointConstraints();
    const usablePartitions = useUsablePartitions({ devices, selectedDisks });
    const requiredSize = useRequiredSize();
    const { storageScenarioId } = useContext(StorageContext);

    useEffect(() => {
        if ([diskTotalSpace, diskFreeSpace, mountPointConstraints, requiredSize, usablePartitions].some(itm => itm === undefined)) {
            return;
        }

        setScenarioAvailability(() => {
            const newAvailability = {};

            for (const scenario of scenarios) {
                const availability = scenario.check({
                    devices,
                    diskFreeSpace,
                    diskTotalSpace,
                    duplicateDeviceNames,
                    mountPointConstraints,
                    partitioning: partitioning.path,
                    requiredSize,
                    selectedDisks,
                    storageScenarioId: partitioning.storageScenarioId,
                    usablePartitions,
                });
                newAvailability[scenario.id] = availability;
            }
            return newAvailability;
        });
    }, [
        devices,
        diskFreeSpace,
        diskTotalSpace,
        duplicateDeviceNames,
        mountPointConstraints,
        partitioning.path,
        partitioning.storageScenarioId,
        requiredSize,
        selectedDisks,
        usablePartitions,
    ]);

    useEffect(() => {
        let selectedScenarioId = "";
        let availableScenarioExists = false;

        // Don't mess up with the scenarios while cockpit storage mode is active
        if (showStorage) {
            return;
        }

        if (storageScenarioId && scenarioAvailability[storageScenarioId].available === undefined) {
            return;
        }

        // If we detect mount points, there is an still an applied partitioning
        // and we should wait for the reset to take effect in the backend before deciding on the
        // selected scenario
        if (Object.keys(mountPoints).length > 0 && storageScenarioId !== "use-configured-storage") {
            return;
        }

        for (const scenario of scenarios) {
            const availability = scenarioAvailability[scenario.id];
            if (!availability.hidden && availability.available) {
                availableScenarioExists = true;
                if (scenario.id === storageScenarioId) {
                    debug(`Selecting backend scenario ${scenario.id}`);
                    selectedScenarioId = scenario.id;
                }
                if (!selectedScenarioId && scenario.default) {
                    debug(`Selecting default scenario ${scenario.id}`);
                    selectedScenarioId = scenario.id;
                }
            }
        }

        if (availableScenarioExists) {
            dispatch(setStorageScenarioAction(selectedScenarioId));
        }
        setIsFormValid(availableScenarioExists);
    }, [dispatch, mountPoints, scenarioAvailability, setIsFormValid, showStorage, storageScenarioId]);

    const onScenarioToggled = (scenarioId) => {
        dispatch(setStorageScenarioAction(scenarioId));
    };

    const scenarioItems = scenarios.filter(scenario => !scenarioAvailability[scenario.id].hidden).map(scenario => (
        <Radio
          className={idPrefix + "-scenario"}
          key={scenario.id}
          id={idPrefix + "-scenario-" + scenario.id}
          value={scenario.id}
          name={idPrefix + "-scenario"}
          label={scenario.label}
          isDisabled={!scenarioAvailability[scenario.id].available || isFormDisabled}
          isChecked={storageScenarioId === scenario.id}
          onChange={() => onScenarioToggled(scenario.id)}
          description={scenario.detail}
          body={
              <>
                  {selectedDisks.length > 0 && scenarioAvailability[scenario.id].reason &&
                  <span className={idPrefix + "-scenario-disabled-reason"}>
                      {scenarioAvailability[scenario.id].reason}
                  </span>}
                  {selectedDisks.length > 0 && <span className={idPrefix + "-scenario-disabled-shorthint"}>{scenarioAvailability[scenario.id].hint}</span>}
                  {scenarioAvailability[scenario.id].review && <span className={idPrefix + "-scenario-review"}>{scenarioAvailability[scenario.id].review}</span>}
                  {scenario.action && <scenario.action availability={scenarioAvailability[scenario.id]} />}
              </>
          } />
    ));

    return scenarioItems;
};

export const InstallationScenario = ({
    dispatch,
    idPrefix,
    isFormDisabled,
    setIsFormValid,
    showStorage,
}) => {
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";
    const headingLevel = isBootIso ? "h2" : "h3";
    const { storageScenarioId } = useContext(StorageContext);

    return (
        <>
            <Title headingLevel={headingLevel}>{_("How would you like to install?")}</Title>
            <FormGroup className={idPrefix + "-scenario-group"} isStack hasNoPaddingTop data-scenario={storageScenarioId}>
                <InstallationScenarioSelector
                  dispatch={dispatch}
                  idPrefix={idPrefix}
                  isFormDisabled={isFormDisabled}
                  setIsFormValid={setIsFormValid}
                  showStorage={showStorage}
                />
            </FormGroup>
        </>
    );
};
