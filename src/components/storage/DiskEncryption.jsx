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

import React, { useContext } from "react";
import {
    Alert,
    Checkbox,
    EmptyState,
    EmptyStateFooter,
    EmptyStateHeader,
    EmptyStateIcon,
    Form,
    FormGroup,
    FormSection,
    Spinner,
    Text,
    TextContent,
    TextVariants,
    Title,
} from "@patternfly/react-core";

import {
    setLuksEncryptionDataAction
} from "../../actions/storage-actions.js";

import { RuntimeContext, StorageContext, SystemTypeContext } from "../../contexts/Common.jsx";

import { Keyboard } from "../localization/Keyboard.jsx";
import { PasswordFormFields, ruleLength } from "../Password.jsx";

import "./DiskEncryption.scss";

const _ = cockpit.gettext;
const idPrefix = "disk-encryption";

const ruleAscii = {
    check: (policy, password) => password.length > 0 && /^[\x20-\x7F]*$/.test(password),
    id: "ascii",
    isError: false,
    text: () => _("The passphrase you have provided contains non-ASCII characters. You may not be able to switch between keyboard layouts when typing it."),
};

const CheckDisksSpinner = (
    <EmptyState id={idPrefix + "-next-spinner"}>
        <EmptyStateHeader titleText={<>{_("Checking storage configuration")}</>} icon={<EmptyStateIcon icon={Spinner} />} headingLevel="h4" />
        <EmptyStateFooter>
            <TextContent>
                <Text component={TextVariants.p}>
                    {_("This may take a moment")}
                </Text>
            </TextContent>
        </EmptyStateFooter>
    </EmptyState>
);

export const DiskEncryption = ({ dispatch, setIsFormValid }) => {
    const { luks } = useContext(StorageContext);
    const luksPolicy = useContext(RuntimeContext).passwordPolicies.luks;
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    if (luks.passphrase === undefined) {
        return CheckDisksSpinner;
    }

    const encryptedDevicesCheckbox = content => (
        <Checkbox
          id={idPrefix + "-encrypt-devices"}
          label={_("Encrypt my data")}
          isChecked={luks.encrypted}
          onChange={(_event, isEncrypted) => {
              dispatch(setLuksEncryptionDataAction({ encrypted: isEncrypted }));
          }}
          body={content}
        />
    );

    const encryptionContent = (
        <>
            {!isBootIso && (
                <>
                    <FormGroup
                      label={_("Keyboard layout during boot")}
                    >
                        <Keyboard
                          idPrefix={idPrefix}
                          setIsFormValid={setIsFormValid}
                        />
                    </FormGroup>
                    <Alert
                      isInline
                      isPlain
                      variant="info"
                      title={_("This layout will be used for unlocking your system on boot")} />
                </>
            )}
            <PasswordFormFields
              idPrefix={idPrefix}
              policy={luksPolicy}
              password={luks.passphrase}
              setPassword={(value) => dispatch(setLuksEncryptionDataAction({ passphrase: value }))}
              passwordLabel={_("Passphrase")}
              confirmPassword={luks.confirmPassphrase}
              setConfirmPassword={(value) => dispatch(setLuksEncryptionDataAction({ confirmPassphrase: value }))}
              confirmPasswordLabel={_("Confirm passphrase")}
              rules={[ruleLength, ruleAscii]}
              setIsValid={setIsFormValid}
            />
        </>
    );

    return (
        <Form onSubmit={e => { e.preventDefault(); return false }}>
            <FormSection
              title={<Title headingLevel="h3">{_("Encryption")}</Title>}
            >
                <TextContent>
                    <Text component={TextVariants.p}>
                        {_("Secure your data using disk-based encryption. Only applies to new partitions")}
                    </Text>
                </TextContent>
                {encryptedDevicesCheckbox(luks.encrypted ? encryptionContent : null)}
            </FormSection>
        </Form>
    );
};
