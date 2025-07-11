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

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    Button,
    Flex,
    FlexItem,
    HelperText,
    HelperTextItem,
    Label,
    MenuToggle,
    Select,
    SelectGroup,
    SelectOption,
    Switch,
    TextInput,
    useWizardFooter
} from "@patternfly/react-core";
import { TrashIcon } from "@patternfly/react-icons";

import {
    applyStorage,
    setManualPartitioningRequests
} from "../../apis/storage_partitioning.js";

import {
    getDeviceAncestors,
    getDeviceChildren,
    getLockedLUKSDevices,
    getUsableDevicesManualPartitioning,
    hasDuplicateFields,
    isDuplicateRequestField,
} from "../../helpers/storage.js";
import {
    checkIfArraysAreEqual,
} from "../../helpers/utils.js";

import { StorageContext } from "../../contexts/Common.jsx";

import { getNewPartitioning, useMountPointConstraints, useOriginalDevices } from "../../hooks/Storage.jsx";

import { EmptyStatePanel } from "cockpit-components-empty-state.jsx";
import { ListingTable } from "cockpit-components-table.jsx";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";

import "./MountPointMapping.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-mount-point-mapping";

/* Filter out the partitioning requests array to contain only:
 * - rows with required mount points
 * - rows with mount points already selected by the user
 * @param {Array} requests - partitioning requests
 * @param {Array} mountPointConstraints - constraints on mount points
 * @returns {Array} filtered requests
 */
const getInitialRequests = (requests, mountPointConstraints) => {
    const constrainedRequests = mountPointConstraints.filter(constraint =>
        !!constraint["mount-point"].v).map(constraint => {
        const originalRequest = requests.find(request => request["mount-point"] === constraint["mount-point"].v);
        const request = ({ "mount-point": constraint["mount-point"].v, reformat: constraint["mount-point"].v === "/" });

        if (originalRequest) {
            return { ...originalRequest, ...request };
        }

        return request;
    });

    const extraRequests = requests.filter(r => (
        r["mount-point"] &&
        !mountPointConstraints.find(m => m["mount-point"].v === r["mount-point"])
    )) || [];

    return [...constrainedRequests, ...extraRequests];
};

/* Check validity of the requests array
 * @param {Array} requests - partitioning requests
 * @deviceData {Object} deviceData - device data
 * @returns {boolean}
 */
const getRequestsValid = (requests, deviceData) => {
    const checkValidRequest = r => {
        return (
            r["mount-point"] &&
            r["device-spec"] &&
            !isReformatInvalid(deviceData, r, requests)[0]
        );
    };

    /* When requests change check for duplicate mount point or device assignments and update form validity */
    const isFormValid = (
        !hasDuplicateFields(requests, "mount-point") &&
        !hasDuplicateFields(requests, "device-spec") &&
        requests.every(checkValidRequest)
    );

    return isFormValid;
};

const isReformatInvalid = (deviceData, request, requests) => {
    const device = request["device-spec"];

    if (!device || !request.reformat) {
        return [false, ""];
    }

    if (!deviceData[device].formatData.formattable.v) {
        return [true, cockpit.format(_("Selected device's format '$0' cannot be reformatted."),
                                     deviceData[device].formatData.type.v)];
    }

    const children = getDeviceChildren({ device, deviceData });

    /* When parent device is re-formatted all children must:
     * - either exist in the mount points mapper table and  be re-formatted
     * - or not exist in the mountpoints mapper table
     */
    const isChildReformatValid = children.every(child => {
        const childRequest = requests.find(r => r["device-spec"] === child);

        return !childRequest || childRequest.reformat === true;
    });

    if (!isChildReformatValid) {
        return [true, _("Mismatch between parent device and child device reformat selection.")];
    } else {
        return [false, ""];
    }
};

const requestsToDbus = (requests) => {
    return requests.map(row => {
        return {
            "device-spec": cockpit.variant("s", row["device-spec"] || ""),
            "format-options": cockpit.variant("s", row["format-options"] || ""),
            "format-type": cockpit.variant("s", row["format-type"] || ""),
            "mount-options": cockpit.variant("s", row["mount-options"] || ""),
            "mount-point": cockpit.variant("s", row["mount-point"] || ""),
            reformat: cockpit.variant("b", !!row.reformat),
        };
    });
};

/* Build the backend-requests object from the unapplied requests.
 * @param {Array.<Object>} requests An array of request objects from back-end
 * @param {Array.<Object>} newRequests An array of request objects from front-end
 * @param string partitioning DBus path to a partitioning
 * @returns {Promise}
 */
const updatePartitioningRequests = ({ newRequests, partitioning, requests }) => {
    const backendRequests = [...requests];

    backendRequests.forEach((backendRequest, backendRequestIndex) => {
        const newRequestIndex = newRequests.findIndex(r => r["device-spec"] === backendRequest["device-spec"]);

        if (newRequestIndex === -1) {
            // When a 'device' is not selected in the front-end set the mount-point to empty string
            backendRequests[backendRequestIndex]["mount-point"] = "";
        } else if (newRequests[newRequestIndex]?.["device-spec"]) {
            //  Otherwise sync the object from the front-end to back-end
            backendRequests[backendRequestIndex] = newRequests[newRequestIndex];
        }
    });

    return setManualPartitioningRequests({
        partitioning,
        requests: requestsToDbus(backendRequests),
    });
};

const isDeviceMountPointInvalid = (deviceData, mountPointConstraints, request) => {
    const device = request["device-spec"];
    const constrainedMountPointData = mountPointConstraints.find(val => val["mount-point"].v === request["mount-point"]);

    if (!device || !request["mount-point"] || !constrainedMountPointData) {
        return [false, ""];
    }

    // we have constraints for filesystem type for required and recommended mount points from the backend) {
    if (constrainedMountPointData && constrainedMountPointData["required-filesystem-type"].v !== "" &&
        deviceData[device].formatData.type.v !== constrainedMountPointData["required-filesystem-type"].v) {
        return [true,
            cockpit.format(_("'$0' must be on a device formatted to '$1'"),
                           request["mount-point"], constrainedMountPointData["required-filesystem-type"].v)];
    }
    if (constrainedMountPointData && !constrainedMountPointData["encryption-allowed"].v &&
        deviceData[device].type.v === "luks/dm-crypt") {
        return [true,
            cockpit.format(_("'$0' filesystem cannot be on an encrypted block device"),
                           request["mount-point"])];
    }

    return [false, ""];
};

const MountPointColumn = ({ handleRequestChange, idPrefix, isRecommendedMountPoint, isRequiredMountPoint, request, requestIndex, requests }) => {
    const mountpoint = request["mount-point"] || "";

    const [mountPointText, setMountPointText] = useState(mountpoint);

    const duplicatedMountPoint = isDuplicateRequestField(requests, "mount-point", mountpoint);

    const swapMountpoint = mountpoint === "swap";

    useEffect(() => {
        setMountPointText(request["mount-point"] || "");
    }, [request]);

    return (
        <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsNone" }}>
            <Flex spaceItems={{ default: "spaceItemsMd" }} flexWrap={{ default: "nowrap" }}>
                {((isRequiredMountPoint || isRecommendedMountPoint) && !duplicatedMountPoint) || swapMountpoint
                    ? (
                        <FlexItem
                          className={idPrefix + "__mountpoint-text"}
                          id={idPrefix}
                        >
                            {mountpoint || request["format-type"]}
                        </FlexItem>
                    )
                    : <TextInput
                        className={idPrefix + "__mountpoint-text"}
                        id={idPrefix}
                        onBlur={() => handleRequestChange({ deviceSpec: request["device-spec"], mountPoint: mountPointText, requestIndex })}
                        onChange={(_event, val) => setMountPointText(val)}
                        value={mountPointText}
                    />}
                {isRequiredMountPoint && <Label color="yellow">{_("Required")}</Label>}
                {!isRequiredMountPoint && isRecommendedMountPoint && <Label color="yellow">{_("Recommended")}</Label>}
                {!isRequiredMountPoint && !isRecommendedMountPoint && <Label color="purple">{_("Custom")}</Label>}

            </Flex>
            {mountpoint && duplicatedMountPoint &&
                <HelperText>
                    <HelperTextItem variant="error">
                        {_("Duplicate mount point.")}
                    </HelperTextItem>
                </HelperText>}
        </Flex>
    );
};

export const DeviceColumnSelect = ({
    deviceData,
    devices,
    handleRequestChange,
    idPrefix,
    isRequiredMountPoint,
    lockedLUKSDevices,
    request,
    requestIndex
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const device = request["device-spec"];
    const optionGroups = {};

    for (const device of devices) {
        const deviceName = deviceData[device].name.v;

        const ancestors = getDeviceAncestors(deviceData, device);
        const parentDisk = [device, ...ancestors].find(ancestor => deviceData[ancestor]["is-disk"].v);
        const parentPartition = [device, ...ancestors].find(ancestor => deviceData[ancestor].type.v === "partition");
        const typeLabel = device[parentPartition]?.attrs?.v?.["partition-type-name"] || "";

        const formatType = deviceData[device]?.formatData.type.v;
        const format = deviceData[device]?.formatData.description.v;
        const size = cockpit.format_bytes(deviceData[device]?.total.v);
        const description = (
            typeLabel && typeLabel !== deviceName
                ? cockpit.format("$0 $1, used by $2", size, format, typeLabel)
                : cockpit.format("$0 $1", size, format)
        );

        const isLockedLUKS = lockedLUKSDevices.some(p => device.includes(p));
        /* Disable the following devices:
         * - Locked LUKS devices
         * - Swap devices when the mount point is preset (required) as these reset it
         */
        const isAriaDisabled = isLockedLUKS || (formatType === "swap" && isRequiredMountPoint);

        const node = (
            <SelectOption
              data-device-name={deviceName}
              data-device-id={device}
              description={description}
              isAriaDisabled={isAriaDisabled}
              itemId={device}
              key={device}
            >
                {deviceName}
            </SelectOption>
        );

        if (optionGroups[parentDisk]) {
            optionGroups[parentDisk].push(node);
        } else {
            optionGroups[parentDisk] = [node];
        }
    }

    const getToggleText = () => {
        if (!device) return cockpit.gettext("Select a device");

        const name = deviceData[device]?.name.v;
        const size = cockpit.format_bytes(deviceData[device]?.total.v);
        const isAmbiguous = Object.values(deviceData).filter(d => d.name.v === name).length > 1;

        return isAmbiguous ? cockpit.format("$0 ($1)", name, size) : name;
    };

    return (
        <Select
          menuAppendTo="inline"
          isGrouped={Object.keys(optionGroups).length > 1}
          isOpen={isOpen}
          selected={device}
          variant="single"
          onOpenChange={setIsOpen}
          onSelect={(_, selection) => {
              handleRequestChange({ deviceSpec: selection, mountPoint: request["mount-point"], requestIndex });
              setIsOpen(false);
          }}
          onClear={() => {
              handleRequestChange({ deviceSpec: "", mountPoint: request["mount-point"], requestIndex });
              setIsOpen(false);
          }}
          shouldFocusToggleOnSelect
          toggle={toggleRef => (
              <MenuToggle
                ref={toggleRef}
                isExpanded={isOpen}
                onClick={() => setIsOpen(prev => !prev)}
                id={idPrefix + "-select-toggle"}
              >
                  <span className="pf-v6-c-select__toggle-text">
                      {device ? getToggleText() : _("Select a device")}
                  </span>
              </MenuToggle>
          )}
        >
            {Object.keys(optionGroups).map(disk => {
                if (Object.keys(optionGroups).length === 1) {
                    return optionGroups[disk];
                }
                const groupLabel = (
                    cockpit.format(
                        _("$0 ($1)"),
                        deviceData[disk]?.description.v,
                        deviceData[disk]?.name.v
                    )
                );
                return (
                    <SelectGroup label={groupLabel} key={disk}>
                        {optionGroups[disk]}
                    </SelectGroup>
                );
            })}
        </Select>
    );
};

const DeviceColumn = ({ deviceData, devices, handleRequestChange, idPrefix, isRequiredMountPoint, lockedLUKSDevices, mountPointConstraints, request, requestIndex, requests }) => {
    const device = request["device-spec"];
    const duplicatedDevice = isDuplicateRequestField(requests, "device-spec", device);
    const [deviceInvalid, errorMessage] = isDeviceMountPointInvalid(deviceData, mountPointConstraints, request);

    return (
        <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsNone" }}>
            <DeviceColumnSelect
              deviceData={deviceData}
              devices={devices}
              idPrefix={idPrefix}
              isRequiredMountPoint={isRequiredMountPoint}
              handleRequestChange={handleRequestChange}
              lockedLUKSDevices={lockedLUKSDevices}
              request={request}
              requestIndex={requestIndex}
            />
            {device && duplicatedDevice &&
                <HelperText>
                    <HelperTextItem variant="error">
                        {_("Duplicate device.")}
                    </HelperTextItem>
                </HelperText>}
            {deviceInvalid &&
                <HelperText>
                    <HelperTextItem variant="error">
                        {errorMessage}
                    </HelperTextItem>
                </HelperText>}
        </Flex>
    );
};

const FormatColumn = ({ deviceData, handleRequestChange, idPrefix, request, requestIndex, requests }) => {
    const [reformatInvalid, reformatErrorMsg] = isReformatInvalid(deviceData, request, requests);
    const FormatSwitch = () => {
        return (
            <Switch
              id={idPrefix + "-switch"}
              isChecked={!!request.reformat}
              aria-label={_("Reformat")}
              onChange={(_event, checked) => handleRequestChange({ deviceSpec: request["device-spec"], mountPoint: request["mount-point"], reformat: checked, requestIndex })}
            />
        );
    };

    return (
        <Flex id={idPrefix}>
            <FormatSwitch />
            {reformatInvalid &&
                <HelperText>
                    <HelperTextItem variant="error">
                        {reformatErrorMsg}
                    </HelperTextItem>
                </HelperText>}
        </Flex>
    );
};

const MountPointRowRemove = ({ handleRequestChange, requestIndex }) => {
    const handleRemove = () => {
        // remove row from requests and update requests with higher ID
        handleRequestChange({ remove: true, requestIndex });
    };

    return (
        <Button
          aria-label={_("Remove")}
          icon={<TrashIcon />}
          onClick={handleRemove}
          variant="plain"
        />
    );
};

const getRequestRow = ({
    allDevices,
    deviceData,
    handleRequestChange,
    idPrefix,
    lockedLUKSDevices,
    mountPointConstraints,
    request,
    requestIndex,
    requests,
}) => {
    const columnClassName = idPrefix + "__column";
    const isRequiredMountPoint = (
        request["mount-point"] !== "" &&
        mountPointConstraints.filter(val => val.required.v && val["mount-point"].v === request["mount-point"]).length > 0
    );
    const isRecommendedMountPoint = mountPointConstraints.filter(val => val.recommended.v && val["mount-point"].v === request["mount-point"]).length > 0;
    const duplicatedMountPoint = isDuplicateRequestField(requests, "mount-point", request["mount-point"]);
    const rowId = idPrefix + "-row-" + (requestIndex + 1);

    return ({
        columns: [
            {
                props: { className: columnClassName },
                title: (
                    <MountPointColumn
                      handleRequestChange={handleRequestChange}
                      idPrefix={rowId + "-mountpoint"}
                      isRequiredMountPoint={isRequiredMountPoint}
                      isRecommendedMountPoint={isRecommendedMountPoint}
                      request={request}
                      requestIndex={requestIndex}
                      requests={requests}
                    />
                )
            },
            {
                props: { className: columnClassName },
                title: (
                    <DeviceColumn
                      deviceData={deviceData}
                      devices={allDevices}
                      handleRequestChange={handleRequestChange}
                      idPrefix={rowId + "-device"}
                      isRequiredMountPoint={isRequiredMountPoint}
                      lockedLUKSDevices={lockedLUKSDevices}
                      request={request}
                      requestIndex={requestIndex}
                      requests={requests}
                      mountPointConstraints={mountPointConstraints}
                    />
                )
            },
            {
                props: { className: columnClassName },
                title: (
                    <FormatColumn
                      deviceData={deviceData}
                      handleRequestChange={handleRequestChange}
                      idPrefix={rowId + "-format"}
                      request={request}
                      requestIndex={requestIndex}
                      requests={requests}
                    />
                )
            },
            {
                props: { className: columnClassName },
                title: (
                    (isRequiredMountPoint && !duplicatedMountPoint) ? null : <MountPointRowRemove requestIndex={requestIndex} handleRequestChange={handleRequestChange} />
                )
            }
        ],
        props: { id: rowId, key: requestIndex },
    });
};

const getNewRequestProps = ({ deviceSpec, mountPoint, reformat, requests }) => {
    const existingRequestForDev = requests.find(device => device["device-spec"] === deviceSpec);
    const newProps = { ...existingRequestForDev };

    if (mountPoint !== undefined) {
        newProps["mount-point"] = mountPoint;
    }
    if (deviceSpec !== undefined) {
        newProps["device-spec"] = deviceSpec;
        if (newProps["format-type"] === "swap") {
            newProps["mount-point"] = "swap";
        }
    }
    if (reformat !== undefined) {
        newProps.reformat = !!reformat;
    }

    return newProps;
};

const RequestsTable = ({
    idPrefix,
    setIsFormValid,
    setStepNotification,
}) => {
    const { diskSelection, partitioning } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const deviceData = useOriginalDevices();
    const mountPointConstraints = useMountPointConstraints({ devices: deviceData, selectedDisks });
    const requests = partitioning?.requests;
    const reusePartitioning = useExistingPartitioning();
    const [unappliedRequests, setUnappliedRequests] = useState();
    const allDevices = useMemo(() => {
        return requests?.filter(r => isUsableDevice(r["device-spec"], deviceData)).map(r => r["device-spec"]) || [];
    }, [requests, deviceData]);
    const isLoadingPartitioning = !reusePartitioning || mountPointConstraints === undefined || !requests;
    const lockedLUKSDevices = useMemo(
        () => getLockedLUKSDevices(selectedDisks, deviceData),
        [deviceData, selectedDisks]
    );

    // Add the required mount points to the initial requests
    useEffect(() => {
        if (isLoadingPartitioning || unappliedRequests !== undefined) {
            return;
        }

        const initialRequests = getInitialRequests(requests, mountPointConstraints);
        setUnappliedRequests(initialRequests);

        setIsFormValid(getRequestsValid(initialRequests, deviceData));
    }, [deviceData, setIsFormValid, partitioning.path, requests, isLoadingPartitioning, unappliedRequests, mountPointConstraints]);

    const handleRequestChange = useCallback(({ deviceSpec, mountPoint, reformat, remove, requestIndex }) => {
        const newRequests = [...unappliedRequests];
        if (remove) {
            // Remove a request from the specified index
            newRequests.splice(requestIndex, 1);
        } else {
            const newRequestProps = newRequests[requestIndex] || {};
            const newRequest = (
                getNewRequestProps({
                    deviceSpec,
                    mountPoint: mountPoint || newRequestProps.mountPoint,
                    reformat: reformat !== undefined ? reformat : newRequestProps.reformat,
                    requests
                })
            );

            if (requestIndex === unappliedRequests.length) {
                // Add new request in the end of the array
                newRequests.push(newRequest);
            } else {
                // Update existing request
                newRequests[requestIndex] = newRequest;
            }
        }

        setIsFormValid(getRequestsValid(newRequests, deviceData));

        /* Sync newRequests to the backend */
        updatePartitioningRequests({
            newRequests,
            partitioning: partitioning.path,
            requests
        }).catch(ex => {
            setStepNotification(ex);
            setIsFormValid(false);
        });

        setUnappliedRequests(newRequests);
    }, [setIsFormValid, deviceData, unappliedRequests, requests, partitioning.path, setStepNotification]);

    if (isLoadingPartitioning || unappliedRequests === undefined) {
        return <EmptyStatePanel loading />;
    }

    return (
        <>
            <ListingTable
              aria-label={_("Mount point assignment")}
              columns={[
                  { props: { width: 30 }, title: _("Mount point") },
                  { props: { width: 40 }, title: _("Device") },
                  { props: { width: 20 }, title: _("Reformat") },
                  { props: { "aria-label": _("Remove"), width: 10 }, title: "" },
              ]}
              emptyCaption={_("No devices")}
              id={idPrefix}
              rows={unappliedRequests
                      .map((request, idx) => (
                          getRequestRow({
                              allDevices,
                              deviceData,
                              handleRequestChange,
                              idPrefix,
                              lockedLUKSDevices,
                              mountPointConstraints,
                              request,
                              requestIndex: idx,
                              requests: unappliedRequests,
                          })
                      ))} />
            <div>
                <Button
                  variant="secondary"
                  onClick={() => handleRequestChange({ requestIndex: unappliedRequests.length })}>
                    {_("Add mount")}
                </Button>
            </div>
        </>
    );
};

const isUsableDevice = (devSpec, deviceData) => {
    const device = deviceData[devSpec];
    if (device === undefined || device.formatData === undefined) {
        return false;
    }

    // luks is allowed -- we need to be able to unlock it
    if (device.formatData.type.v === "luks") {
        return true;
    }

    // only swap and mountable filesystems should be shown in the mount point assignment
    if (device.formatData.type.v === "swap" || device.formatData.mountable.v === true) {
        return true;
    }

    return false;
};

const useExistingPartitioning = () => {
    const { diskSelection, partitioning } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;
    const devices = useOriginalDevices();
    const [usedPartitioning, setUsedPartitioning] = useState();

    const reusePartitioning = useMemo(() => {
        const usableDevices = getUsableDevicesManualPartitioning({ devices, selectedDisks });

        // Disk devices are not allowed in the mount point assignment
        const usedDevices = (partitioning?.requests?.map(r => r["device-spec"]) || []);
        if (checkIfArraysAreEqual(usedDevices, usableDevices)) {
            return true;
        }
        return false;
    }, [devices, selectedDisks, partitioning.requests]);

    useEffect(() => {
        const _setPartitioningPath = async () => {
            if (!reusePartitioning || partitioning?.method !== "MANUAL") {
                /* Reset the bootloader drive before we schedule partitions
                 * The bootloader drive is automatically set during the partitioning, so
                 * make sure we always reset the previous value before we run another one,
                 * so it can be automatically set again based on the current disk selection.
                 * Otherwise, the partitioning can fail with an error.
                 */
                const path = await getNewPartitioning({ method: "MANUAL", storageScenarioId: "mount-point-mapping" });
                setUsedPartitioning(path);
            } else {
                setUsedPartitioning(partitioning.path);
            }
        };

        _setPartitioningPath();
    }, [reusePartitioning, partitioning?.method, partitioning?.path]);

    return usedPartitioning === partitioning.path;
};

const MountPointMapping = ({
    setIsFormValid,
    setStepNotification,
}) => {
    // Display custom footer
    const getFooter = useMemo(() => <CustomFooter setStepNotification={setStepNotification} />, [setStepNotification]);
    useWizardFooter(getFooter);

    return (
        <RequestsTable
          idPrefix={SCREEN_ID + "-table"}
          setStepNotification={setStepNotification}
          setIsFormValid={setIsFormValid}
        />
    );
};

const CustomFooter = ({ setStepNotification }) => {
    const { partitioning } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const step = new Page().id;
    const onNext = ({ goToNextStep, setIsFormDisabled }) => {
        return applyStorage({
            devices,
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
            partitioning: partitioning.path,
        });
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};

export class Page {
    constructor (isBootIso, storageScenarioId) {
        this.component = MountPointMapping;
        this.id = SCREEN_ID;
        this.label = _("Manual disk configuration");
        this.isHidden = storageScenarioId !== "mount-point-mapping";
        this.title = _("Manual disk configuration: Mount point mapping");
    }
}
