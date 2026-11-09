/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Form, FormGroup, FormSection } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { MenuToggle } from "@patternfly/react-core/dist/esm/components/MenuToggle/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Select, SelectList, SelectOption } from "@patternfly/react-core/dist/esm/components/Select/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Title } from "@patternfly/react-core/dist/esm/components/Title/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Grid, GridItem } from "@patternfly/react-core/dist/esm/layouts/Grid/index.js";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table/dist/esm/index.js";

import {
    createPartitioningFromRequest,
    getAutopartConfiguration,
    getAutopartDBusRequest,
    getPartitioningRequest,
} from "../../../apis/storage_partitioning.js";

import { StorageContext, StorageDefaultsContext } from "../../../contexts/Common.jsx";

import { useMountPointConstraints } from "../../../hooks/Storage.jsx";

import "./PartitioningScheme.scss";

const _ = cockpit.gettext;
const idPrefix = "partitioning-scheme";

// Each preview creates and configures a partitioning, so wait for the user to stop fiddling.
const PREVIEW_DEBOUNCE_MS = 300;

/* Which schemes exist is the backend's to decide, but naming them is not: the
 * Storage module runs in its own locale and would answer in the wrong language.
 */
const schemeLabels = {
    BTRFS: {
        getDescription: () => _("Snapshots and compression, with volumes sharing one pool"),
        getLabel: () => _("Btrfs"),
    },
    LVM: {
        getDescription: () => _("Volumes that can be resized after installation"),
        getLabel: () => _("LVM"),
    },
    LVM_THINP: {
        getDescription: () => _("Advanced LVM with thin provisioning"),
        getLabel: () => _("LVM thin provisioning"),
    },
    PLAIN: {
        getDescription: () => _("Simple and traditional layout"),
        getLabel: () => _("Standard partitions"),
    },
    STRATIS: {
        getDescription: () => _("Modern storage pooling"),
        getLabel: () => _("Stratis"),
    },
};

// A scheme this version has no name for is still usable, so fall back to its id.
const describeScheme = ({ hasFileSystemType, id }) => ({
    description: schemeLabels[id]?.getDescription(),
    hasFileSystemType,
    id,
    title: schemeLabels[id]?.getLabel() ?? id,
});

const getDefaultConfig = ({ defaultFileSystem, defaultScheme }) => ({
    excluded: [],
    fileSystem: defaultFileSystem,
    scheme: defaultScheme,
});

const getMountPointLabel = mountPoint => (
    mountPoint === "swap"
        ? _("Create a swap partition")
        : cockpit.format(_("Create a separate $0 partition"), mountPoint)
);

// A device without a mount point is swap, which is excluded under that name.
const getExcludeKey = device => device.mountPoint || device.format;

/* A request can only drop mount points the default layout already creates, so
 * the layout itself decides what there is to offer. Mount points the platform
 * needs to boot are not negotiable, and a mount point the user already dropped
 * is missing from the layout but still has to keep its checkbox.
 */
const getOptionalMountPoints = ({ constraints, devices, excluded }) => {
    const required = (constraints ?? []).map(constraint => constraint["mount-point"].v);
    const inLayout = (devices ?? []).map(getExcludeKey);

    return [...new Set([...inLayout, ...excluded])]
            .filter(mountPoint => !required.includes(mountPoint))
            .sort();
};

const useLayoutPreview = ({ request }) => {
    const [preview, setPreview] = useState({ isLoading: true });
    const latestRequest = useRef(0);
    const queue = useRef(Promise.resolve());

    useEffect(() => {
        const requestId = ++latestRequest.current;
        // Keep the previous layout on screen while recomputing, but drop a stale
        // error so a fixed configuration stops showing the old complaint.
        setPreview(previous => ({ devices: previous.devices, isLoading: true }));

        const timer = setTimeout(() => {
            // Configure one partitioning at a time so that the newest request is
            // also the last one announced by the backend as the current layout.
            queue.current = queue.current.catch(() => {}).then(async () => {
                if (requestId !== latestRequest.current) {
                    return;
                }

                try {
                    const { layout } = await createPartitioningFromRequest({ configure: true, request });
                    if (requestId === latestRequest.current) {
                        setPreview({ devices: layout, isLoading: false });
                    }
                } catch (error) {
                    if (requestId === latestRequest.current) {
                        setPreview({ error, isLoading: false });
                    }
                }
            });
        }, PREVIEW_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [request]);

    return preview;
};

const SelectField = ({ id, label, onChange, options, value }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <FormGroup label={label} fieldId={`${id}-toggle`}>
            <Select
              id={id}
              isOpen={isOpen}
              selected={value}
              onSelect={(_ev, selected) => { onChange(selected); setIsOpen(false) }}
              onOpenChange={setIsOpen}
              toggle={toggleRef => (
                  <MenuToggle
                    ref={toggleRef}
                    id={`${id}-toggle`}
                    isExpanded={isOpen}
                    isFullWidth
                    onClick={() => setIsOpen(!isOpen)}
                  >
                      {options.find(option => option.id === value).title}
                  </MenuToggle>
              )}
            >
                <SelectList>
                    {options.map(({ description, id: optionId, title }) => (
                        <SelectOption
                          key={optionId}
                          id={`${id}-${optionId}`}
                          value={optionId}
                          description={description}
                        >
                            {title}
                        </SelectOption>
                    ))}
                </SelectList>
            </Select>
        </FormGroup>
    );
};

const LayoutPreview = ({ devices, error }) => {
    if (error) {
        return (
            <Alert
              isInline
              variant="warning"
              id={idPrefix + "-preview-error"}
              title={_("Cannot create this layout on the selected disks")}
            >
                {error.message || String(error)}
            </Alert>
        );
    }

    if (!devices) {
        return null;
    }

    // Mount points in path order, then devices without one such as swap.
    const sorted = [...devices].sort((a, b) => {
        if (!a.mountPoint || !b.mountPoint) {
            return (a.mountPoint ? 0 : 1) - (b.mountPoint ? 0 : 1);
        }
        return a.mountPoint.localeCompare(b.mountPoint);
    });

    return (
        <Table variant="compact" id={idPrefix + "-preview"}>
            <Thead>
                <Tr>
                    <Th>{_("Mount point")}</Th>
                    <Th>{_("Size")}</Th>
                    <Th>{_("Type")}</Th>
                </Tr>
            </Thead>
            <Tbody>
                {sorted.map(({ deviceName, format, mountPoint, size }) => (
                    <Tr
                      key={deviceName}
                      data-device={deviceName}
                      data-format={format}
                      data-mount={mountPoint}
                    >
                        <Td className={idPrefix + "__mount-point"}>{mountPoint || format}</Td>
                        <Td>{cockpit.format_bytes(size)}</Td>
                        <Td>{format}</Td>
                    </Tr>
                ))}
            </Tbody>
        </Table>
    );
};

const ConfigureModal = ({ initialConfig, initialRequest, onCancel, onSave }) => {
    const partitioningOptions = useContext(StorageDefaultsContext);
    const { supportedFileSystems } = partitioningOptions;
    const schemes = partitioningOptions.supportedSchemes.map(describeScheme);
    const constraints = useMountPointConstraints();
    const [config, setConfig] = useState(initialConfig);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState();
    const scheme = schemes.find(s => s.id === config.scheme);
    const hasFileSystemType = scheme?.hasFileSystemType ?? false;
    const request = useMemo(
        () => getAutopartDBusRequest({ ...config, baseRequest: initialRequest, hasFileSystemType }),
        [config, hasFileSystemType, initialRequest]
    );
    const { devices, error, isLoading } = useLayoutPreview({ request });

    // Compute the checkbox list once from the first preview, then keep it static
    const [optionalMountPoints, setOptionalMountPoints] = useState(null);

    useEffect(() => {
        if (devices && optionalMountPoints === null) {
            setOptionalMountPoints(
                getOptionalMountPoints({ constraints, devices, excluded: initialConfig.excluded })
            );
        }
    }, [devices, optionalMountPoints, constraints, initialConfig.excluded]);

    const toggleMountPoint = (mountPoint, isCreated) => setConfig({
        ...config,
        excluded: isCreated
            ? config.excluded.filter(excluded => excluded !== mountPoint)
            : [...config.excluded, mountPoint],
    });

    const handleSave = async () => {
        setIsSubmitting(true);
        setSubmitError();
        try {
            await onSave(request);
        } catch (exception) {
            setSubmitError(exception);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        // A preview in flight creates a partitioning of its own, so let it
        // finish rather than letting it become current after the restored one.
        if (isLoading || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setSubmitError();
        try {
            await onCancel();
        } catch (exception) {
            setSubmitError(exception);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
          id={idPrefix + "-modal"}
          isOpen
          onClose={handleCancel}
          variant={ModalVariant.medium}
        >
            <ModalHeader />
            <ModalBody>
                <Grid hasGutter>
                    <GridItem span={6}>
                        <Form onSubmit={e => { e.preventDefault(); return false }}>
                            <SelectField
                              id={idPrefix + "-scheme"}
                              label={_("Partitioning scheme")}
                              value={config.scheme}
                              onChange={newScheme => setConfig({ ...config, scheme: newScheme })}
                              options={schemes}
                            />
                            {hasFileSystemType &&
                            <SelectField
                              id={idPrefix + "-file-system"}
                              label={_("File system")}
                              value={config.fileSystem}
                              onChange={fileSystem => setConfig({ ...config, fileSystem })}
                              options={supportedFileSystems.map(id => ({ id, title: id }))}
                            />}
                            {optionalMountPoints && optionalMountPoints.length > 0 &&
                            <FormGroup>
                                {optionalMountPoints.map(mountPoint => (
                                    <Checkbox
                                      key={mountPoint}
                                      id={`${idPrefix}-create-${mountPoint.replace(/\//g, "-")}`}
                                      label={getMountPointLabel(mountPoint)}
                                      isChecked={!config.excluded.includes(mountPoint)}
                                      isDisabled={isLoading}
                                      onChange={(_ev, isCreated) => toggleMountPoint(mountPoint, isCreated)}
                                    />
                                ))}
                            </FormGroup>}
                            <Button
                              variant="link"
                              isInline
                              id={idPrefix + "-reset"}
                              onClick={() => setConfig(getDefaultConfig(partitioningOptions))}
                            >
                                {_("Reset to defaults")}
                            </Button>
                        </Form>
                    </GridItem>
                    <GridItem span={6}>
                        <Flex spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsCenter" }}>
                            <Title headingLevel="h4">{_("Preview")}</Title>
                            {isLoading && <Spinner size="md" id={idPrefix + "-preview-spinner"} />}
                        </Flex>
                        <LayoutPreview devices={devices} error={error} />
                        {submitError &&
                        <Alert
                          isInline
                          variant="danger"
                          id={idPrefix + "-submit-error"}
                          title={_("Cannot apply this storage layout")}
                        >
                            {submitError.message || String(submitError)}
                        </Alert>}
                    </GridItem>
                </Grid>
            </ModalBody>
            <ModalFooter>
                <Button
                  variant="primary"
                  id={idPrefix + "-save"}
                  isAriaDisabled={isLoading || !!error || isSubmitting}
                  onClick={handleSave}
                >
                    {_("Save")}
                </Button>
                <Button
                  variant="link"
                  id={idPrefix + "-cancel"}
                  isAriaDisabled={isLoading || isSubmitting}
                  onClick={handleCancel}
                >
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export const PartitioningScheme = () => {
    const partitioningOptions = useContext(StorageDefaultsContext);
    const { partitioning } = useContext(StorageContext);
    const [modalState, setModalState] = useState();
    // The request is the configuration. Keeping a copy here would go stale as
    // soon as the screen is left and remounted.
    const config = getAutopartConfiguration(
        partitioning.requests[0],
        partitioningOptions.defaultFileSystem
    );
    const scheme = describeScheme(
        partitioningOptions.supportedSchemes.find(s => s.id === config.scheme)
    );

    const openModal = async () => {
        // The store keeps requests without DBus variants, but the modal has to
        // build and restore the request in the form the backend accepts.
        const request = await getPartitioningRequest({ partitioning: partitioning.path });
        setModalState({ config, request });
    };

    // Saving keeps the previewed configuration as a fresh partitioning so that
    // applyStorage configures it exactly once; cancelling recreates the request
    // from before the modal opened.
    const closeWithRequest = async request => {
        await createPartitioningFromRequest({ request });
        setModalState();
    };

    return (
        <Form onSubmit={e => { e.preventDefault(); return false }}>
            <FormSection
              id={idPrefix + "-section"}
              title={<Title headingLevel="h3">{_("Storage layout")}</Title>}
            >
                <FormGroup>
                    <Flex direction={{ default: "row" }} spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsBaseline" }}>
                        <div id={idPrefix + "-summary"}>
                            {cockpit.format(_("Storage is automatically configured using $0."), scheme.title)}
                        </div>
                        <Button
                          variant="link"
                          isInline
                          id={idPrefix + "-change"}
                          onClick={openModal}
                        >
                            {_("Change")}
                        </Button>
                    </Flex>
                </FormGroup>
                {modalState &&
                <ConfigureModal
                  initialConfig={modalState.config}
                  initialRequest={modalState.request}
                  onCancel={() => closeWithRequest(modalState.request)}
                  onSave={closeWithRequest}
                />}
            </FormSection>
        </Form>
    );
};
