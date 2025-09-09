/*
 * Copyright (C) 2025 Red Hat, Inc.
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

import React, { useEffect, useState } from "react";
import {
    Button, Checkbox,
    Flex, FlexItem,
    HelperText, HelperTextItem,
    Modal, ModalBody, ModalFooter, ModalHeader,
    Spinner,
    Stack,
    TextInput,
    ValidatedOptions,
} from "@patternfly/react-core";
import { TrashIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

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
