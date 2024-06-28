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

import { fmt_to_fragments as fmtToFragments } from "utils";

import React, { useContext, useEffect, useState } from "react";
import {
    ActionList,
    Button,
    Flex,
    FlexItem,
    HelperText,
    HelperTextItem,
    Modal,
    ModalVariant,
    Panel,
    Stack,
    Text,
    TextContent,
} from "@patternfly/react-core";
import { HddIcon, TrashIcon, UndoIcon } from "@patternfly/react-icons";

import { removeDevice } from "../../apis/storage_partitioning_automatic_resizable.js";

import { ListingTable } from "cockpit-components-table.jsx";

import { StorageContext } from "../Common.jsx";
import { useDiskFreeSpace, useRequiredSize } from "./Common.jsx";

import "./ReclaimSpaceModal.scss";

const _ = cockpit.gettext;
const idPrefix = "reclaim-space-modal";

export const ReclaimSpaceModal = ({ isFormDisabled, onClose, onNext }) => {
    const { deviceTrees, diskSelection, partitioning } = useContext(StorageContext);
    const { devices } = deviceTrees[""];
    const [onNextClicked, setOnNextClicked] = useState(false);
    const [unappliedActions, setUnappliedActions] = useState(
        Object.keys(devices).reduce((acc, device) => { acc[device] = []; return acc }, {})
    );
    const rows = (
        diskSelection.selectedDisks
                .map(disk => getDeviceRow(disk, devices, 0, unappliedActions, setUnappliedActions))
                .flat(Infinity)
    );

    const onReclaim = async () => {
        for (const item of Object.entries(unappliedActions)) {
            const [device, actions] = item;
            for (const action of actions) {
                if (action === "remove") {
                    await removeDevice({ deviceName: device, deviceTree: partitioning.deviceTree.path });
                }
            }
        }
        setOnNextClicked(true);
    };

    useEffect(() => {
        // Call the onNextClicked only once the form is not disabled
        // otherwise it silently fails
        if (onNextClicked && !isFormDisabled) {
            onNext();
            setOnNextClicked(false);
        }
    }, [onNextClicked, isFormDisabled, onNext]);

    return (
        <Modal
          description={
              <TextContent>
                  <Text>{_("Remove existing filesystems to free up space for the installation.")}</Text>
                  <Text>{
                      _(
                          "Removing a filesystem will permanently delete all of the data it contains. " +
                        "Be sure to have backups of anything important before reclaiming space."
                      )
                  }
                  </Text>
              </TextContent>
          }
          id={idPrefix}
          isOpen
          onClose={onClose}
          size="md"
          title={_("Reclaim space")}
          variant={ModalVariant.large}
          footer={
              <ReclaimFooter isFormDisabled={isFormDisabled} unappliedActions={unappliedActions} onReclaim={onReclaim} onClose={onClose} />
          }
        >
            <Panel variant="bordered">
                <ListingTable
                  aria-label={_("Reclaim space")}
                  columns={[
                      { props: { width: 20 }, title: _("Name") },
                      { props: { width: 20 }, title: _("Location") },
                      { props: { width: 20 }, title: _("Type") },
                      { props: { width: 20 }, title: _("Space") },
                      { props: { width: 20 }, title: _("Actions") }
                  ]}
                  emptyCaption={_("No devices")}
                  id={idPrefix + "-table"}
                  rows={rows}
                />
            </Panel>
        </Modal>
    );
};

const ReclaimFooter = ({ isFormDisabled, onClose, onReclaim, unappliedActions }) => {
    const { deviceTrees, diskSelection } = useContext(StorageContext);
    const { devices } = deviceTrees[""];
    const diskFreeSpace = useDiskFreeSpace({ devices, selectedDisks: diskSelection.selectedDisks });
    const requiredSize = useRequiredSize();
    const selectedSpaceToReclaim = (
        Object.keys(unappliedActions)
                .filter(device => unappliedActions[device].includes("remove"))
                .reduce((acc, device) => acc + devices[device].total.v - devices[device].free.v, 0)
    );
    const status = (diskFreeSpace + selectedSpaceToReclaim) < requiredSize ? "warning" : "success";

    return (
        <Stack hasGutter>
            <HelperText>
                <HelperTextItem isDynamic variant={status}>
                    {fmtToFragments(
                        _("Available free space: $0. Installation requires: $1."),
                        <b id={idPrefix + "-hint-available-free-space"}>{cockpit.format_bytes(diskFreeSpace + selectedSpaceToReclaim)}</b>,
                        <b>{cockpit.format_bytes(requiredSize)}</b>
                    )}
                </HelperTextItem>
            </HelperText>
            <ActionList>
                <Button isDisabled={status === "warning" || isFormDisabled} key="reclaim" variant="warning" onClick={onReclaim}>
                    {_("Reclaim space")}
                </Button>
                <Button key="cancel" variant="link" onClick={onClose}>
                    {_("Cancel")}
                </Button>
            </ActionList>
        </Stack>
    );
};

const getDeviceRow = (disk, devices, level = 0, unappliedActions, setUnappliedActions) => {
    const device = devices[disk];
    const description = device.description.v ? cockpit.format("$0 ($1)", disk, device.description.v) : disk;
    const isDisk = device["is-disk"].v;
    const descriptionWithIcon = (
        isDisk
            ? (
                <Flex spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem><HddIcon /></FlexItem>
                    <FlexItem>{description}</FlexItem>
                </Flex>
            )
            : description
    );
    const location = device["is-disk"].v ? device.path.v : "";
    const classNames = [
        idPrefix + "-table-row",
        idPrefix + "-device-level-" + level,
    ];

    if (!device.children.v.length) {
        const parentDevice = device.parents.v[0] ? devices[device.parents.v[0]] : undefined;
        const siblings = parentDevice?.children.v;
        const isLastChild = !siblings || siblings.findIndex((child) => child === disk) === siblings.length - 1;

        if (isLastChild) {
            classNames.push(idPrefix + "-device-leaf");
        }
    }
    const size = level < 2 ? cockpit.format_bytes(device.total.v) : "";
    const deviceActions = (
        <DeviceActions
          device={device}
          level={level}
          unappliedActions={unappliedActions}
          setUnappliedActions={setUnappliedActions}
        />
    );

    return [
        {
            columns: [
                { title: descriptionWithIcon },
                { title: location },
                { title: device.type.v },
                { title: size },
                { title: deviceActions }
            ],
            props: { className: classNames.join(" "), key: disk },
        },
        ...device.children.v.map((child) => getDeviceRow(child, devices, level + 1, unappliedActions, setUnappliedActions))
    ];
};

const DeviceActions = ({ device, level, setUnappliedActions, unappliedActions }) => {
    // Only show actions for disks and the first level of partitions
    // This is to simplify the feature for the first iteration
    if (level > 1) {
        return null;
    }

    const parents = device.parents.v;
    const parentHasRemove = parents?.some((parent) => unappliedActions[parent].includes("remove"));

    // Disable the remove action for disk devices without partitions
    const isRemoveDisabled = device.type.v === "disk" && device.children.v.length === 0;
    const onRemove = () => {
        setUnappliedActions((prevUnappliedActions) => {
            const _unappliedActions = { ...prevUnappliedActions };
            _unappliedActions[device.name.v].push("remove");

            return _unappliedActions;
        });
    };
    const onUndo = () => {
        setUnappliedActions((prevUnappliedActions) => {
            const _unappliedActions = { ...prevUnappliedActions };
            _unappliedActions[device.name.v].pop();

            return _unappliedActions;
        });
    };

    const hasBeenRemoved = parentHasRemove || unappliedActions[device.name.v]?.includes("remove");
    const hasUnappliedActions = !parentHasRemove && unappliedActions[device.name.v]?.length > 0;
    // Do not show 'delete' text for disks directly, we show 'delete' text for the contained partitions
    const deleteText = (
        device.type.v !== "disk"
            ? <span className={idPrefix + "-device-action-delete"}>{_("delete")}</span>
            : ""
    );

    return (
        <Flex spaceItems={{ default: "spaceItemsSm" }}>
            {hasBeenRemoved
                ? deleteText
                : <Button variant="plain" onClick={onRemove} isDisabled={isRemoveDisabled} icon={<TrashIcon />} aria-label={_("delete")} />}
            {hasUnappliedActions && <Button variant="plain" icon={<UndoIcon />} onClick={onUndo} aria-label={_("undo")} />}
        </Flex>
    );
};
