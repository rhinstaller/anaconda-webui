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
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { EmptyState, EmptyStateFooter } from "@patternfly/react-core/dist/esm/components/EmptyState/index.js";
import { Form, FormGroup, FormSection } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Title } from "@patternfly/react-core/dist/esm/components/Title/index.js";

import {
    setLuksEncryptionDataAction
} from "../../../actions/storage-actions.js";

import { LanguageContext, RuntimeContext, StorageContext, SystemTypeContext } from "../../../contexts/Common.jsx";

import { Keyboard } from "../../localization/Keyboard.jsx";
import { PasswordFormFields, ruleLength } from "../../Password.jsx";

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
    <EmptyState headingLevel="h4" icon={Spinner} titleText={<>{_("Checking storage configuration")}</>} id={idPrefix + "-next-spinner"}>
        <EmptyStateFooter>
            <Content>
                <Content component={ContentVariants.p}>
                    {_("This may take a moment")}
                </Content>
            </Content>
        </EmptyStateFooter>
    </EmptyState>
);

export const DiskEncryption = ({ dispatch, setIsFormValid }) => {
    const { luks } = useContext(StorageContext);
    const luksPolicy = useContext(RuntimeContext).passwordPolicies.luks;
    const isGnome = useContext(SystemTypeContext).desktopVariant === "GNOME";
    const { compositorSelectedLayout, keyboardLayouts } = useContext(LanguageContext);
    const selectedKeyboard = keyboardLayouts.find(k => k["layout-id"]?.v === compositorSelectedLayout);

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
            <FormGroup
              label={_("Keyboard layout during boot")}
            >
                {isGnome
                    ? (
                        <Keyboard
                          idPrefix={idPrefix}
                          isGnome={isGnome}
                          setIsFormValid={setIsFormValid}
                        />
                    )
                    : (
                        <TextInput
                          value={selectedKeyboard ? selectedKeyboard.description.v : ""}
                          readOnlyVariant="default"
                        />
                    )}
            </FormGroup>
            <Alert
              isInline
              isPlain
              variant="info"
              title={_("This layout will be used for unlocking your system on boot")} />
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
                <Content>
                    <Content component={ContentVariants.p}>
                        {_("Secure your data using disk-based encryption. Only applies to new partitions")}
                    </Content>
                </Content>
                {encryptedDevicesCheckbox(luks.encrypted ? encryptionContent : null)}
            </FormSection>
        </Form>
    );
};
