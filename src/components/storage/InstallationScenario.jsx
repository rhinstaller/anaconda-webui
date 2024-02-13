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
import React, { useContext, useState, useEffect } from "react";

import {
    FormGroup,
    Radio,
    Title,
} from "@patternfly/react-core";

import { SystemTypeContext } from "../Common.jsx";
import { helpEraseAll, helpUseFreeSpace, helpMountPointMapping, helpConfiguredStorage } from "./HelpAutopartOptions.jsx";
import { useDiskTotalSpace, useDiskFreeSpace, useDuplicateDeviceNames, useHasFilesystems, useRequiredSize, useMountPointConstraints } from "./Common.jsx";
import {
    setInitializationMode,
} from "../../apis/storage_disk_initialization.js";

import "./InstallationScenario.scss";

const _ = cockpit.gettext;

function AvailabilityState (available = false, hidden = true, reason = null, hint = null) {
    this.available = available;
    this.hidden = hidden;
    this.reason = reason;
    this.hint = hint;
}

const checkEraseAll = ({ requiredSize, diskTotalSpace }) => {
    const availability = new AvailabilityState();

    availability.hidden = false;

    if (diskTotalSpace < requiredSize) {
        availability.available = false;
        availability.reason = _("Not enough space on selected disks.");
        availability.hint = cockpit.format(_(
            "The installation needs $1 of disk space; " +
            "however, the capacity of the selected disks is only $0."
        ), cockpit.format_bytes(diskTotalSpace), cockpit.format_bytes(requiredSize));
    } else {
        availability.available = true;
    }
    return availability;
};

export const checkUseFreeSpace = ({ diskFreeSpace, diskTotalSpace, requiredSize }) => {
    const availability = new AvailabilityState();

    availability.hidden = false;

    if (diskFreeSpace > 0 && diskTotalSpace > 0) {
        availability.hidden = diskFreeSpace === diskTotalSpace;
    }
    if (diskFreeSpace < requiredSize) {
        availability.available = false;
        availability.reason = _("Not enough free space on the selected disks.");
        availability.hint = cockpit.format(
            _("To use this option, resize or remove existing partitions to free up at least $0."),
            cockpit.format_bytes(requiredSize)
        );
    } else {
        availability.available = true;
    }
    return availability;
};

const checkMountPointMapping = ({ hasFilesystems, duplicateDeviceNames }) => {
    const availability = new AvailabilityState();

    availability.hidden = false;

    if (!hasFilesystems) {
        availability.available = false;
        availability.reason = _("No usable devices on the selected disks.");
    } else if (duplicateDeviceNames.length) {
        availability.available = false;
        availability.reason = cockpit.format(_("Some devices use the same name: $0."), duplicateDeviceNames.join(", "));
        availability.hint = _("To use this option, rename devices to have unique names.");
    } else {
        availability.available = true;
    }
    return availability;
};

export const checkConfiguredStorage = ({ deviceData, mountPointConstraints, partitioning, newMountPoints, scenarioPartitioningMapping }) => {
    const availability = new AvailabilityState();

    const currentPartitioningMatches = partitioning !== undefined && scenarioPartitioningMapping["use-configured-storage"] === partitioning;
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
                            const { dir, content, subvolumes } = object;

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
                            const biosboot = Object.keys(deviceData).find(d => deviceData[d].formatData.type.v === "biosboot");

                            return biosboot !== undefined;
                        }

                        return false;
                    })
        )
    );

    return availability;
};

export const scenarios = [{
    id: "erase-all",
    label: _("Erase data and install"),
    detail: helpEraseAll,
    check: checkEraseAll,
    default: true,
    // CLEAR_PARTITIONS_ALL = 1
    initializationMode: 1,
    buttonLabel: _("Erase data and install"),
    buttonVariant: "danger",
    screenWarning: _("Erasing the data cannot be undone. Be sure to have backups."),
    dialogTitleIconVariant: "warning",
    dialogWarningTitle: _("Erase data and install?"),
    dialogWarning: _("The selected disks will be erased, this cannot be undone. Are you sure you want to continue with the installation?"),
}, {
    id: "use-free-space",
    label: _("Use free space for the installation"),
    detail: helpUseFreeSpace,
    check: checkUseFreeSpace,
    default: false,
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    buttonLabel: _("Install"),
    buttonVariant: "primary",
    screenWarning: _("To prevent loss, make sure to backup your data."),
    dialogTitleIconVariant: "",
    dialogWarningTitle: _("Install on the free space?"),
    dialogWarning: _("The installation will use the available space on your devices and will not erase any device data."),
}, {
    id: "mount-point-mapping",
    label: _("Mount point assignment"),
    default: false,
    detail: helpMountPointMapping,
    check: checkMountPointMapping,
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    buttonLabel: _("Apply mount point assignment and install"),
    buttonVariant: "danger",
    screenWarning: _("To prevent loss, make sure to backup your data."),
    dialogTitleIconVariant: "",
    dialogWarningTitle: _("Install on the custom mount points?"),
    dialogWarning: _("The installation will use your configured partitioning layout."),
}, {
    id: "use-configured-storage",
    label: _("Use configured storage"),
    default: false,
    detail: helpConfiguredStorage,
    check: checkConfiguredStorage,
    // CLEAR_PARTITIONS_NONE = 0
    initializationMode: 0,
    buttonLabel: _("Apply storage configuration and install"),
    buttonVariant: "danger",
    screenWarning: _("To prevent loss, make sure to backup your data."),
    dialogTitleIconVariant: "",
    dialogWarningTitle: _("Install using the configured storage?"),
    dialogWarning: _("The installation will use your configured partitioning layout."),
}
];

export const getScenario = (scenarioId) => {
    return scenarios.filter(s => s.id === scenarioId)[0];
};

export const scenarioForInitializationMode = (mode) => {
    const ss = scenarios.filter(s => s.initializationMode === mode);
    if (ss.length > 0) {
        return ss[0];
    }
};

export const getDefaultScenario = () => {
    return scenarios.filter(s => s.default)[0];
};

const InstallationScenarioSelector = ({
    deviceData,
    deviceNames,
    idPrefix,
    isFormDisabled,
    onCritFail,
    partitioning,
    scenarioPartitioningMapping,
    selectedDisks,
    setIsFormValid,
    setStorageScenarioId,
    storageScenarioId,
}) => {
    const [scenarioAvailability, setScenarioAvailability] = useState(Object.fromEntries(
        scenarios.map((s) => [s.id, new AvailabilityState()])
    ));
    const diskTotalSpace = useDiskTotalSpace({ selectedDisks, devices: deviceData });
    const diskFreeSpace = useDiskFreeSpace({ selectedDisks, devices: deviceData });
    const duplicateDeviceNames = useDuplicateDeviceNames({ deviceNames });
    const hasFilesystems = useHasFilesystems({ selectedDisks, devices: deviceData });
    const mountPointConstraints = useMountPointConstraints();
    const requiredSize = useRequiredSize();

    useEffect(() => {
        if ([diskTotalSpace, diskFreeSpace, hasFilesystems, mountPointConstraints, requiredSize].some(itm => itm === undefined)) {
            return;
        }

        setScenarioAvailability(oldAvailability => {
            const newAvailability = {};

            for (const scenario of scenarios) {
                const availability = scenario.check({
                    diskFreeSpace,
                    diskTotalSpace,
                    duplicateDeviceNames,
                    hasFilesystems,
                    mountPointConstraints,
                    partitioning,
                    requiredSize,
                    scenarioPartitioningMapping,
                    storageScenarioId,
                });
                newAvailability[scenario.id] = availability;
            }
            return newAvailability;
        });
    }, [
        diskFreeSpace,
        diskTotalSpace,
        duplicateDeviceNames,
        hasFilesystems,
        mountPointConstraints,
        partitioning,
        requiredSize,
        storageScenarioId,
        scenarioPartitioningMapping,
    ]);

    useEffect(() => {
        let selectedScenarioId = "";
        let availableScenarioExists = false;

        if (storageScenarioId && scenarioAvailability[storageScenarioId].available === undefined) {
            return;
        }

        for (const scenario of scenarios) {
            const availability = scenarioAvailability[scenario.id];
            if (!availability.hidden && availability.available) {
                availableScenarioExists = true;
                if (scenario.id === storageScenarioId) {
                    console.log(`Selecting backend scenario ${scenario.id}`);
                    selectedScenarioId = scenario.id;
                }
                if (!selectedScenarioId && scenario.default) {
                    console.log(`Selecting default scenario ${scenario.id}`);
                    selectedScenarioId = scenario.id;
                }
            }
        }
        if (availableScenarioExists) {
            setStorageScenarioId(selectedScenarioId);
        }
        setIsFormValid(availableScenarioExists);
    }, [scenarioAvailability, setStorageScenarioId, setIsFormValid, storageScenarioId]);

    useEffect(() => {
        const applyScenario = async (scenarioId) => {
            const scenario = getScenario(scenarioId);
            await setInitializationMode({ mode: scenario.initializationMode }).catch(console.error);
        };
        if (storageScenarioId) {
            applyScenario(storageScenarioId);
        }
    }, [storageScenarioId]);

    const onScenarioToggled = (scenarioId) => {
        setStorageScenarioId(scenarioId);
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
              </>
          } />
    ));

    return scenarioItems;
};

export const InstallationScenario = ({
    deviceData,
    deviceNames,
    idPrefix,
    isFormDisabled,
    onCritFail,
    partitioning,
    scenarioPartitioningMapping,
    selectedDisks,
    setIsFormValid,
    setStorageScenarioId,
    storageScenarioId,
}) => {
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";
    const headingLevel = isBootIso ? "h2" : "h3";

    return (
        <>
            <Title headingLevel={headingLevel}>{_("How would you like to install?")}</Title>
            <FormGroup isStack hasNoPaddingTop>
                <InstallationScenarioSelector
                  deviceData={deviceData}
                  deviceNames={deviceNames}
                  idPrefix={idPrefix}
                  isFormDisabled={isFormDisabled}
                  onCritFail={onCritFail}
                  partitioning={partitioning}
                  scenarioPartitioningMapping={scenarioPartitioningMapping}
                  selectedDisks={selectedDisks}
                  setIsFormValid={setIsFormValid}
                  setStorageScenarioId={setStorageScenarioId}
                  storageScenarioId={storageScenarioId}
                />
            </FormGroup>
        </>
    );
};
