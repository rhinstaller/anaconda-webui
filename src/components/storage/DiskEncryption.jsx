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

import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    Checkbox,
    EmptyState,
    EmptyStateFooter,
    EmptyStateHeader,
    EmptyStateIcon,
    Form,
    Spinner,
    Text,
    TextContent,
    TextVariants,
    useWizardFooter,
} from "@patternfly/react-core";

import { applyStorage } from "../../apis/storage_partitioning.js";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { RuntimeContext, StorageContext } from "../Common.jsx";
import { PasswordFormFields, ruleLength } from "../Password.jsx";

import "./DiskEncryption.scss";

const _ = cockpit.gettext;

const ruleAscii = {
    check: (policy, password) => password.length > 0 && /^[\x20-\x7F]*$/.test(password),
    id: "ascii",
    isError: false,
    text: () => _("The passphrase you have provided contains non-ASCII characters. You may not be able to switch between keyboard layouts when typing it."),
};

const CheckDisksSpinner = (
    <EmptyState id="installation-destination-next-spinner">
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

const DiskEncryption = ({
    idPrefix,
    isInProgress,
    setIsFormValid,
}) => {
    const { partitioning } = useContext(StorageContext);
    const request = partitioning?.requests?.[0];
    const [confirmPassword, setConfirmPassword] = useState(request?.passphrase || "");
    const [isEncrypted, setIsEncrypted] = useState(request?.encrypted);
    const [password, setPassword] = useState(request?.passphrase || "");
    const luksPolicy = useContext(RuntimeContext).passwordPolicies.luks;

    // Display custom footer
    const getFooter = useMemo(() => <CustomFooter encrypt={isEncrypted} encryptPassword={password} />, [isEncrypted, password]);
    useWizardFooter(getFooter);

    const encryptedDevicesCheckbox = content => (
        <Checkbox
          id={idPrefix + "-encrypt-devices"}
          label={_("Encrypt my data")}
          isChecked={isEncrypted}
          onChange={(_event, isEncrypted) => setIsEncrypted(isEncrypted)}
          body={content}
        />
    );

    const passphraseForm = (
        <PasswordFormFields
          idPrefix={idPrefix}
          policy={luksPolicy}
          password={password}
          setPassword={setPassword}
          passwordLabel={_("Passphrase")}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          confirmPasswordLabel={_("Confirm passphrase")}
          rules={[ruleLength, ruleAscii]}
          setIsValid={setIsFormValid}
        />
    );

    useEffect(() => {
        setIsFormValid(!isEncrypted);
    }, [setIsFormValid, isEncrypted]);

    if (isInProgress) {
        return CheckDisksSpinner;
    }

    return (
        <>
            <TextContent>
                <Text component={TextVariants.p}>
                    {_("Encryption helps secure your data, to prevent others from accessing it.")}
                </Text>
                <Text component={TextVariants.p}>
                    {_("Only new partitions will be encrypted. Existing partitions will remain untouched.")}
                </Text>
            </TextContent>
            <Form>
                {encryptedDevicesCheckbox(isEncrypted ? passphraseForm : null)}
            </Form>
        </>
    );
};

const CustomFooter = ({ encrypt, encryptPassword }) => {
    const step = usePage({}).id;
    const onNext = ({ setIsFormDisabled, setStepNotification, goToNextStep }) => {
        return applyStorage({
            encrypt,
            encryptPassword,
            onFail: ex => {
                console.error(ex);
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
        });
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};

export const usePage = () => {
    const { storageScenarioId } = useContext(StorageContext);

    return ({
        component: DiskEncryption,
        id: "disk-encryption",
        isHidden: ["mount-point-mapping", "use-configured-storage"].includes(storageScenarioId),
        label: _("Disk encryption"),
        title: _("Encrypt the selected devices?")
    });
};
