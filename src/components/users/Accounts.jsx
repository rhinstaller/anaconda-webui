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
import React, { useState, useEffect } from "react";
import * as python from "python.js";
import encryptUserPw from "../../scripts/encrypt-user-pw.py";
import { debounce } from "throttle-debounce";

import {
    Form,
    FormGroup,
    FormHelperText,
    HelperText,
    HelperTextItem,
    InputGroup,
    TextInput,
    Title,
} from "@patternfly/react-core";

import "./Accounts.scss";

import { PasswordFormFields, ruleLength } from "../Password.jsx";

const _ = cockpit.gettext;

export function getAccountsState (
    fullName = "",
    userName = "",
    password = "",
    confirmPassword = "",
) {
    return {
        fullName,
        userName,
        password,
        confirmPassword,
    };
}

export const cryptUserPassword = async (password) => {
    const crypted = await python.spawn(encryptUserPw, password, { err: "message", environ: ["LC_ALL=C.UTF-8"] });
    return crypted;
};

export const accountsToDbusUsers = (accounts) => {
    return [{
        name: cockpit.variant("s", accounts.userName || ""),
        gecos: cockpit.variant("s", accounts.fullName || ""),
        password: cockpit.variant("s", accounts.password || ""),
        "is-crypted": cockpit.variant("b", true),
        groups: cockpit.variant("as", ["wheel"]),
    }];
};

const reservedNames = [
    "root",
    "bin",
    "daemon",
    "adm",
    "lp",
    "sync",
    "shutdown",
    "halt",
    "mail",
    "operator",
    "games",
    "ftp",
    "nobody",
    "home",
    "system",
];

const isUserNameWithInvalidCharacters = (userName) => {
    return (
        userName === "." ||
        userName === ".." ||
        userName.match(/^[0-9]+$/) ||
        !userName.match(/^[A-Za-z0-9._][A-Za-z0-9._-]{0,30}([A-Za-z0-9._-]|\$)?$/)
    );
};

const CreateAccount = ({
    idPrefix,
    passwordPolicy,
    setIsUserValid,
    accounts,
    setAccounts,
}) => {
    const [_fullName, _setFullName] = useState(accounts.fullName);
    const [fullName, setFullName] = useState(accounts.fullName);
    const [fullNameInvalidHint, setFullNameInvalidHint] = useState("");
    const [isFullNameValid, setIsFullNameValid] = useState(null);
    const [_userName, _setUserName] = useState(accounts.userName);
    const [userName, setUserName] = useState(accounts.userName);
    const [userNameInvalidHint, setUserNameInvalidHint] = useState("");
    const [isUserNameValid, setIsUserNameValid] = useState(null);
    const [password, setPassword] = useState(accounts.password);
    const [confirmPassword, setConfirmPassword] = useState(accounts.confirmPassword);
    const [isPasswordValid, setIsPasswordValid] = useState(false);

    useEffect(() => {
        debounce(300, () => setUserName(_userName))();
    }, [_userName, setUserName]);

    useEffect(() => {
        debounce(300, () => setFullName(_fullName))();
    }, [_fullName, setFullName]);

    useEffect(() => {
        setIsUserValid(isPasswordValid && isUserNameValid && isFullNameValid !== false);
    }, [setIsUserValid, isPasswordValid, isUserNameValid, isFullNameValid]);

    useEffect(() => {
        let valid = true;
        setUserNameInvalidHint("");
        if (userName.length === 0) {
            valid = null;
        } else if (userName.length > 32) {
            valid = false;
            setUserNameInvalidHint(_("User names must be shorter than 33 characters"));
        } else if (reservedNames.includes(userName)) {
            valid = false;
            setUserNameInvalidHint(_("User name must not be a reserved word"));
        } else if (isUserNameWithInvalidCharacters(userName)) {
            valid = false;
            setUserNameInvalidHint(cockpit.format(_("User name may only contain: letters from a-z, digits 0-9, dash $0, period $1, underscore $2"), "-", ".", "_"));
        }
        setIsUserNameValid(valid);
    }, [userName]);

    useEffect(() => {
        let valid = true;
        setFullNameInvalidHint("");
        if (fullName.length === 0) {
            valid = null;
        } else if (!fullName.match(/^[^:]*$/)) {
            valid = false;
            setFullNameInvalidHint(_("Full name cannot contain colon characters"));
        }
        setIsFullNameValid(valid);
    }, [fullName]);

    const passphraseForm = (
        <PasswordFormFields
          idPrefix={idPrefix}
          policy={passwordPolicy}
          initialPassword={password}
          passwordLabel={_("Passphrase")}
          initialConfirmPassword={confirmPassword}
          confirmPasswordLabel={_("Confirm passphrase")}
          rules={[ruleLength]}
          onChange={setPassword}
          onConfirmChange={setConfirmPassword}
          setIsValid={setIsPasswordValid}
        />
    );

    useEffect(() => {
        setAccounts(ac => ({ ...ac, fullName, userName, password, confirmPassword }));
    }, [setAccounts, fullName, userName, password, confirmPassword]);

    const getValidatedVariant = (valid) => valid === null ? "default" : valid ? "success" : "error";
    const userNameValidated = getValidatedVariant(isUserNameValid);
    const fullNameValidated = getValidatedVariant(isFullNameValid);

    return (
        <Form
          isHorizontal
          id={idPrefix}
        >
            <Title
              headingLevel="h2"
              id={idPrefix + "-title"}
            >
                {_("Create account")}
            </Title>
            {_("This account will have administration priviledge with sudo.")}
            <FormGroup
              label={_("Full name")}
              fieldId={idPrefix + "-full-name"}
            >
                <TextInput
                  id={idPrefix + "-full-name"}
                  value={_fullName}
                  onChange={(_event, val) => _setFullName(val)}
                  validated={fullNameValidated}
                />
                {fullNameValidated === "error" &&
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant={fullNameValidated}>
                            {fullNameInvalidHint}
                        </HelperTextItem>
                    </HelperText>
                </FormHelperText>}
            </FormGroup>
            <FormGroup
              label={_("User name")}
              fieldId={idPrefix + "-user-name"}
            >
                <InputGroup id={idPrefix + "-user-name-input-group"}>
                    <TextInput
                      id={idPrefix + "-user-name"}
                      value={_userName}
                      onChange={(_event, val) => _setUserName(val)}
                      validated={userNameValidated}
                    />
                </InputGroup>
                {userNameValidated === "error" &&
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant={userNameValidated}>
                            {userNameInvalidHint}
                        </HelperTextItem>
                    </HelperText>
                </FormHelperText>}
            </FormGroup>
            {passphraseForm}
        </Form>
    );
};

export const Accounts = ({
    idPrefix,
    setIsFormValid,
    passwordPolicies,
    accounts,
    setAccounts,
}) => {
    const [isUserValid, setIsUserValid] = useState();
    useEffect(() => {
        setIsFormValid(isUserValid);
    }, [setIsFormValid, isUserValid]);

    return (
        <>
            <CreateAccount
              idPrefix={idPrefix + "-create-account"}
              passwordPolicy={passwordPolicies.user}
              setIsUserValid={setIsUserValid}
              accounts={accounts}
              setAccounts={setAccounts}
            />
        </>
    );
};

export const getPageProps = ({ isBootIso }) => {
    return ({
        id: "accounts",
        label: _("Create Account"),
        isHidden: !isBootIso,
        title: null,
    });
};
