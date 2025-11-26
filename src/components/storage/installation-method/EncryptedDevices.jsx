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

import React, { useState } from "react";
import { ActionList, ActionListItem } from "@patternfly/react-core/dist/esm/components/ActionList/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { InputGroup, InputGroupItem } from "@patternfly/react-core/dist/esm/components/InputGroup/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { EyeIcon } from "@patternfly/react-icons/dist/esm/icons/eye-icon";
import { EyeSlashIcon } from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon";
import { LockIcon } from "@patternfly/react-icons/dist/esm/icons/lock-icon";

import {
    findExistingSystems,
    unlockDevice,
} from "../../../apis/storage_devicetree.js";

import { getDevicesAction } from "../../../actions/storage-actions.js";

import { FormHelper } from "cockpit-components-form-helper.jsx";
import { InlineNotification } from "cockpit-components-inline-notification.jsx";

const _ = cockpit.gettext;

const LuksDevices = ({ id, lockedLUKSDevices }) => {
    return (
        <Flex id={id} spaceItems={{ default: "spaceItemsLg" }}>
            {lockedLUKSDevices.map(device => (
                <Flex key={device} spaceItems={{ default: "spaceItemsXs" }} alignItems={{ default: "alignItemsCenter" }}>
                    <LockIcon />
                    <FlexItem>{device}</FlexItem>
                </Flex>
            ))}
        </Flex>
    );
};

export const EncryptedDevices = ({ dispatch, idPrefix, lockedLUKSDevices }) => {
    const [showUnlockDialog, setShowUnlockDialog] = useState(false);
    return (
        <>
            <Alert
              isInline
              title={_("Destination is encrypted")}
              variant="warning"
              actionLinks={
                  <ActionList>
                      <ActionListItem>
                          <Button id={idPrefix + "-unlock-devices-btn"} variant="primary" onClick={() => setShowUnlockDialog(true)}>
                              {_("Unlock")}
                          </Button>
                      </ActionListItem>
                  </ActionList>
              }
            >
                {_("Unlock LUKS-encrypted partitions to keep existing data and show more installation methods.")}
            </Alert>
            {showUnlockDialog &&
            <UnlockDialog
              dispatch={dispatch}
              onClose={() => setShowUnlockDialog(false)}
              lockedLUKSDevices={lockedLUKSDevices} />}
        </>
    );
};

const UnlockDialog = ({ dispatch, lockedLUKSDevices, onClose }) => {
    const [passphrase, setPassphrase] = useState("");
    const [passphraseHidden, setPassphraseHidden] = useState(true);
    const [dialogWarning, setDialogWarning] = useState();
    const [dialogSuccess, setDialogSuccess] = useState();
    const [inProgress, setInProgress] = useState(false);
    const idPrefix = "unlock-device-dialog";

    const onSubmit = async () => {
        setInProgress(true);
        try {
            const res = await Promise.allSettled(
                lockedLUKSDevices.map(device => (
                    unlockDevice({ device, passphrase })
                ))
            );

            if (res.every(r => r.status === "fulfilled")) {
                if (res.every(r => r.value)) {
                    // Refresh the list of existing systems after unlocking the devices
                    findExistingSystems({
                        onFail: exc => setDialogWarning(exc.message),
                        onSuccess: () => {
                            onClose();
                            dispatch(getDevicesAction());
                        },
                    });
                } else {
                    const unlockedDevs = res.reduce((acc, r, i) => {
                        if (r.value) {
                            acc.push(lockedLUKSDevices[i]);
                        }
                        return acc;
                    }, []);
                    if (unlockedDevs.length > 0) {
                        setDialogSuccess(cockpit.format(_("Successfully unlocked $0."), unlockedDevs.join(", ")));
                        setDialogWarning(undefined);
                        setPassphrase("");
                    } else {
                        setDialogSuccess(undefined);
                        setDialogWarning(_("Passphrase did not match any locked device"));
                    }
                    setInProgress(false);
                }

                // Blivet does not send a signal when a device is unlocked,
                // so we need to refresh the device data manually.
                dispatch(getDevicesAction());
            }
        } catch (exc) {
            setDialogWarning(exc.message);
            setInProgress(false);
        }
    };

    return (
        <Modal
          description={_("All devices using this passphrase will be unlocked")}
          id={idPrefix}
          position="top" variant="small" isOpen onClose={() => onClose()}
        >
            <ModalHeader
              title={_("Unlock encrypted devices")}
            />
            <ModalBody>
                <Form
                  onSubmit={e => {
                      e.preventDefault();
                      onSubmit();
                  }}>
                    {dialogSuccess && <InlineNotification type="info" text={dialogSuccess} />}
                    <FormGroup fieldId={idPrefix + "-luks-devices"} label={_("Locked devices")}>
                        <LuksDevices id={idPrefix + "-luks-devices"} lockedLUKSDevices={lockedLUKSDevices} />
                    </FormGroup>
                    <FormGroup fieldId={idPrefix + "-luks-passphrase"} label={_("Passphrase")}>
                        <InputGroup>
                            <InputGroupItem isFill>
                                <TextInput
                                  isRequired
                                  id={idPrefix + "-luks-passphrase"}
                                  type={passphraseHidden ? "password" : "text"}
                                  aria-label={_("Passphrase")}
                                  value={passphrase}
                                  onChange={(_event, val) => setPassphrase(val)}
                                />
                            </InputGroupItem>
                            <InputGroupItem>
                                <Button
                                  variant="control"
                                  onClick={() => setPassphraseHidden(!passphraseHidden)}
                                  aria-label={passphraseHidden ? _("Show passphrase") : _("Hide passphrase")}
                                >
                                    {passphraseHidden ? <EyeIcon /> : <EyeSlashIcon />}
                                </Button>
                            </InputGroupItem>
                        </InputGroup>
                        <FormHelper helperText={dialogWarning} variant="warning" />
                    </FormGroup>
                </Form>
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" onClick={onSubmit} isAriaDisabled={inProgress} isLoading={inProgress} id={idPrefix + "-submit-btn"}>
                    {_("Unlock")}
                </Button>
                <Button variant="secondary" onClick={() => onClose()} id={idPrefix + "-close-btn"}>
                    {_("Close")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
