/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useEffect, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { ValidatedOptions } from "@patternfly/react-core/dist/esm/helpers/constants.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";
import { TrashIcon } from "@patternfly/react-icons/dist/esm/icons/trash-icon";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table/dist/esm/index.js";

import {
    checkNTPServer,
    getTimeServersFromConfig,
    getTimeSources,
    setTimeSources
} from "../../apis/timezone.js";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-date-time";
const NTP_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

const CustomNTPModal = ({ onClose }) => {
    const [errors, setErrors] = useState();
    const [ntpSources, setNtpSources] = useState([]);

    useEffect(() => {
        const loadNtpSources = async () => {
            let srcs = await getTimeSources();
            const ntps = srcs.filter((s) => s.type?.v === "NTP" || s.type?.v === "POOL");
            if (ntps.length) {
                srcs = ntps;
            } else {
                srcs = await getTimeServersFromConfig();
            }
            srcs = srcs.map(src => ({
                ...src,
                isAvailable: true, // Assume all sources are available initially
                isCommitted: true,
            }));
            setNtpSources(srcs);

            // Check if the sources are available
            srcs.map(async src => {
                const isAvailable = await checkNTPServer({
                    hostname: src.hostname.v,
                    isNTS: !!src.isNTS,
                });
                return ({ ...src, isAvailable });
            });
            setNtpSources(srcs);
        };

        loadNtpSources();
    }, []);

    const handleEdit = async ({ hostname, index, isNTS, isPool, validateServer }) => {
        setErrors(errors => ({ ...errors, [index]: undefined }));
        const source = ntpSources[index];

        setNtpSources((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                hostname: { v: hostname !== undefined ? hostname : source.hostname.v },
                isAvailable: true, // Reset availability while editing
                isNTS: isNTS !== undefined ? isNTS : source.isNTS,
                type: { v: isPool !== undefined ? (isPool ? "POOL" : "NTP") : source.type.v },
            };
            return updated;
        });

        if ((hostname || source.hostname.v) && validateServer) {
            if (!NTP_REGEX.test(hostname !== undefined ? hostname : source.hostname.v)) {
                setErrors(errors => ({ ...errors, [index]: _("Invalid hostname") }));
            } else {
                setNtpSources(prev => {
                    const updated = [...prev];
                    updated[index] = {
                        ...updated[index],
                        isAvailable: undefined,
                    };
                    return updated;
                });
                const isAvailable = await checkNTPServer({
                    hostname: hostname !== undefined ? hostname : source.hostname.v,
                    isNTS: isNTS !== undefined ? isNTS : !!source.isNTS,
                });
                setNtpSources(prev => {
                    const updated = [...prev];
                    updated[index] = {
                        ...updated[index],
                        isAvailable,
                    };
                    return updated;
                });
            }
        }
    };

    const handleAdd = () => {
        setNtpSources([
            ...ntpSources,
            {
                hostname: { v: "" },
                isAvailable: true,
                options: { v: ["iburst"] },
                type: { v: "POOL" }
            }
        ]);
    };

    const handleRemove = (idx) => {
        setNtpSources(ntpSources.filter((_, i) => i !== idx));
    };

    const handleConfirm = async () => {
        await setTimeSources({
            sources: ntpSources.map(s => ({
                hostname: cockpit.variant("s", s.hostname.v),
                options: cockpit.variant("as", s.options.v),
                type: cockpit.variant("s", s.type.v),
            }))
        });

        onClose();
    };

    return (
        <Modal
          variant="small"
          id={SCREEN_ID + "-ntp-modal"}
          isOpen
          onClose={onClose}
          aria-labelledby="custom-ntp-title"
        >
            <ModalHeader title={_("Configure custom NTP servers")} labelId="custom-ntp-title" />
            <ModalBody>
                <Stack hasGutter>
                    <Table aria-label={_("NTP Servers")} variant="compact" className={SCREEN_ID + "-ntp-table"}>
                        <Thead>
                            <Tr>
                                <Th>{_("Server")}</Th>
                                <Th>{_("Options")}</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {ntpSources.map((src, index) => (
                                <Tr key={index}>
                                    <Td>
                                        <Stack hasGutter>
                                            <TextInput
                                              customIcon={src.isAvailable === undefined && <Spinner size="sm" />}
                                              id={SCREEN_ID + "-ntp-table-row-" + index + "-hostname"}
                                              validated={
                                                  (errors?.[index]
                                                      ? ValidatedOptions.error
                                                      : ValidatedOptions.default)
                                              }
                                              value={src.hostname.v}
                                              onChange={(e) => handleEdit({ hostname: e.target.value, index })}
                                              onBlur={(e) => handleEdit({ hostname: e.target.value, index, validateServer: true })}
                                              {...(src.isCommitted ? { readOnlyVariant: "plain" } : {})}
                                            />
                                            {(errors?.[index] || src.isAvailable === false) &&
                                            <HelperText>
                                                {errors?.[index] &&
                                                <HelperTextItem variant="error">
                                                    {errors[index]}
                                                </HelperTextItem>}
                                                {src.isAvailable === false &&
                                                <HelperTextItem variant="warning">
                                                    {_("Server is not reachable")}
                                                </HelperTextItem>}
                                            </HelperText>}
                                        </Stack>
                                    </Td>
                                    <Td>
                                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                                            <Checkbox
                                              label={_("Pool")}
                                              id={SCREEN_ID + "-ntp-table-row-" + index + "-pool-checkbox"}
                                              isChecked={src.type.v === "POOL"}
                                              isDisabled={src.isCommitted}
                                              onChange={_event => handleEdit({ index, isPool: _event.target.checked })}
                                            />
                                            <Checkbox
                                              label={_("NTS")}
                                              id={SCREEN_ID + "-ntp-table-row-" + index + "-secure-checkbox"}
                                              isChecked={!!src.isNTS}
                                              isDisabled={src.isCommitted}
                                              onChange={() => handleEdit({ index, isNTS: !src.isNTS, validateServer: true })}
                                            />
                                            <FlexItem align={{ default: "alignRight" }}>
                                                <Button
                                                  variant="plain"
                                                  isInline
                                                  icon={<TrashIcon />}
                                                  aria-label={_("Remove server")}
                                                  onClick={() => handleRemove(index)}
                                                />
                                            </FlexItem>
                                        </Flex>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                    <div>
                        <Button
                          id={SCREEN_ID + "-ntp-table-add-server-button"}
                          variant="link"
                          onClick={handleAdd}
                        >
                            {_("Add another server...")}
                        </Button>
                    </div>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button
                  id={SCREEN_ID + "-ntp-modal-save-button"}
                  isDisabled={ntpSources.filter(src => (
                      src.isAvailable === undefined || src.hostname.v === "")).length > 0}
                  onClick={handleConfirm}
                  variant="primary"
                >
                    {_("Save")}
                </Button>
                <Button variant="link" onClick={onClose}>
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export const CustomNTP = ({ autoDateTime }) => {
    const [showCustomNtpModal, setShowCustomNtpModal] = useState(false);

    return (
        <>
            <Button
              id={`${SCREEN_ID}-configure-ntp`}
              isDisabled={!autoDateTime}
              onClick={() => setShowCustomNtpModal(true)}
              variant="link"
            >
                {_("Configure NTP servers")}
            </Button>
            {showCustomNtpModal &&
            <CustomNTPModal onClose={() => setShowCustomNtpModal(false)}
            />}
        </>
    );
};
