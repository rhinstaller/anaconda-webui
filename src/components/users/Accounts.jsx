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

import { debounce } from "throttle-debounce";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Form, FormGroup, FormHelperText, FormSection } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { InputGroup } from "@patternfly/react-core/dist/esm/components/InputGroup/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import {
    guessUsernameFromFullName,
} from "../../apis/users.js";

import {
    setUsersAction,
} from "../../actions/users-actions.js";

import {
    applyAccounts,
} from "../../helpers/users.js";

import { RuntimeContext, UsersContext } from "../../contexts/Common.jsx";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { PasswordFormFields, ruleLength } from "../Password.jsx";

import "./Accounts.scss";

const _ = cockpit.gettext;

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
    setAccounts,
    setIsUserValid,
}) => {
    const accounts = useContext(UsersContext);
    const [fullName, setFullName] = useState(accounts.fullName);
    const [checkFullName, setCheckFullName] = useState(accounts.fullName);
    const [fullNameInvalidHint, setFullNameInvalidHint] = useState("");
    const [isFullNameValid, setIsFullNameValid] = useState(null);
    const [userName, setUserName] = useState(accounts.userName);
    const [checkUserName, setCheckUserName] = useState(accounts.userName);
    const [userNameInvalidHint, setUserNameInvalidHint] = useState("");
    const [isUserNameValid, setIsUserNameValid] = useState(null);
    const [password, setPassword] = useState(accounts.password);
    const [confirmPassword, setConfirmPassword] = useState(accounts.confirmPassword);
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const passwordPolicy = useContext(RuntimeContext).passwordPolicies.user;
    const [guessingUserName, setGuessingUserName] = useState(false);
    const [skipAccountCreation, setSkipAccountCreation] = useState(accounts.skipAccountCreation);

    useEffect(() => {
        debounce(300, () => setCheckUserName(userName))();
    }, [userName, setCheckUserName]);

    useEffect(() => {
        debounce(300, () => setCheckFullName(fullName))();
    }, [fullName, setCheckFullName]);

    useEffect(() => {
        setIsUserValid(
            (isPasswordValid !== false && isUserNameValid !== false && isFullNameValid !== false) ||
            skipAccountCreation
        );
    }, [skipAccountCreation, setIsUserValid, isPasswordValid, isUserNameValid, isFullNameValid]);

    useEffect(() => {
        let valid = true;
        setUserNameInvalidHint("");
        if (checkUserName.length === 0) {
            valid = null;
        } else if (checkUserName.length > 32) {
            valid = false;
            setUserNameInvalidHint(_("User names must be shorter than 33 characters"));
        } else if (reservedNames.includes(checkUserName)) {
            valid = false;
            setUserNameInvalidHint(_("User name must not be a reserved word"));
        } else if (isUserNameWithInvalidCharacters(checkUserName)) {
            valid = false;
            setUserNameInvalidHint(cockpit.format(_("User name may only contain: letters from a-z, digits 0-9, dash $0, period $1, underscore $2"), "-", ".", "_"));
        }
        setIsUserNameValid(valid);
    }, [checkUserName]);

    useEffect(() => {
        let valid = true;
        setFullNameInvalidHint("");
        if (checkFullName.length === 0) {
            valid = null;
        } else if (!checkFullName.match(/^[^:]*$/)) {
            valid = false;
            setFullNameInvalidHint(_("Full name cannot contain colon characters"));
        }
        setIsFullNameValid(valid);
    }, [checkFullName]);

    const passphraseForm = (
        <PasswordFormFields
          idPrefix={idPrefix}
          policy={passwordPolicy}
          password={password}
          setPassword={setPassword}
          passwordLabel={_("Passphrase")}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          confirmPasswordLabel={_("Confirm passphrase")}
          rules={[ruleLength]}
          setIsValid={setIsPasswordValid}
        />
    );

    useEffect(() => {
        setAccounts({ confirmPassword, fullName, password, skipAccountCreation, userName });
    }, [
        confirmPassword,
        fullName,
        password,
        setAccounts,
        skipAccountCreation,
        userName,
    ]);

    const getValidatedVariant = (valid) => valid === null ? "default" : valid ? "success" : "error";
    const userNameValidated = getValidatedVariant(isUserNameValid);
    const fullNameValidated = getValidatedVariant(isFullNameValid);

    const userAccountCheckbox = content => (
        <Checkbox
          id={idPrefix + "-set-user-account"}
          label={_("Use local account")}
          isChecked={!skipAccountCreation}
          onChange={(_event, enable) => {
              setSkipAccountCreation(!enable);
          }}
          body={content}
        />
    );

    const userFormBody = (
        <>
            <FormSection>
                {_("A standard user account with admin access for making system-wide changes.")}
                <FormGroup
                  label={_("Full name")}
                  fieldId={idPrefix + "-full-name"}
                >
                    <TextInput
                      id={idPrefix + "-full-name"}
                      value={fullName}
                      onChange={(_event, val) => setFullName(val)}
                      onBlur={async (_event) => {
                          if (userName.trim() !== "") {
                              return;
                          }

                          setGuessingUserName(true);

                          const generatedUserName = await guessUsernameFromFullName(_event.target.value);

                          setUserName(generatedUserName);
                          setGuessingUserName(false);
                      }}
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
                  isRequired
                  fieldId={idPrefix + "-user-name"}
                >
                    <InputGroup id={idPrefix + "-user-name-input-group"}>
                        <TextInput
                          id={idPrefix + "-user-name"}
                          isAriaDisabled={guessingUserName}
                          value={userName}
                          onChange={(_event, val) => setUserName(val)}
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
            </FormSection>
            {passphraseForm}
        </>
    );

    return (
        <FormSection
          title={_("Create account")}
        >
            {userAccountCheckbox(
                !skipAccountCreation ? userFormBody : null
            )}
        </FormSection>
    );
};

const RootAccount = ({
    idPrefix,
    setAccounts,
    setIsRootValid,
}) => {
    const accounts = useContext(UsersContext);
    const [password, setPassword] = useState(accounts.rootPassword);
    const [confirmPassword, setConfirmPassword] = useState(accounts.rootConfirmPassword);
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const isRootAccountEnabled = accounts.isRootEnabled;
    const passwordPolicy = useContext(RuntimeContext).passwordPolicies.root;
    const passwordRef = useRef();

    useEffect(() => {
        setIsRootValid(isPasswordValid || !isRootAccountEnabled);
    }, [setIsRootValid, isPasswordValid, isRootAccountEnabled]);

    useEffect(() => {
        if (isRootAccountEnabled) {
            // When the user is enabling root account, we want to focus the password field
            setTimeout(() => {
                if (passwordRef.current) {
                    passwordRef.current.focus();
                }
            }, 100);
        }
    }, [isRootAccountEnabled]);

    const rootAccountCheckbox = content => (
        <Checkbox
          id={idPrefix + "-enable-root-account"}
          label={_("Enable root account")}
          isChecked={isRootAccountEnabled}
          onChange={(_event, enable) => setAccounts({ isRootEnabled: enable })}
          body={content}
        />
    );

    const passphraseForm = (
        <PasswordFormFields
          idPrefix={idPrefix}
          policy={passwordPolicy}
          password={password}
          passwordRef={passwordRef}
          setPassword={setPassword}
          passwordLabel={_("Passphrase")}
          confirmPassword={confirmPassword}
          sectionDescription={_("For better security, avoid using the root account directly. Instead, use the local account above to manage the system.")}
          setConfirmPassword={setConfirmPassword}
          confirmPasswordLabel={_("Confirm passphrase")}
          rules={[ruleLength]}
          setIsValid={setIsPasswordValid}
        />
    );

    useEffect(() => {
        setAccounts({ rootConfirmPassword: confirmPassword, rootPassword: password });
    }, [setAccounts, password, confirmPassword]);

    return (
        <FormSection
          title={_("System")}
        >
            {rootAccountCheckbox(isRootAccountEnabled ? passphraseForm : null)}
        </FormSection>
    );
};

export const Accounts = ({
    dispatch,
    idPrefix,
    setIsFormValid,
}) => {
    const [isUserValid, setIsUserValid] = useState();
    const [isRootValid, setIsRootValid] = useState();
    const accounts = useContext(UsersContext);
    const setAccounts = useMemo(() => args => dispatch(setUsersAction(args)), [dispatch]);

    useEffect(() => {
        const skipRootCreation = !accounts.isRootEnabled;
        const skipAccountCreation = accounts.skipAccountCreation;

        setIsFormValid(
            (skipAccountCreation || isUserValid) &&
            (skipRootCreation || isRootValid) &&
            !(skipRootCreation && skipAccountCreation)
        );
    }, [
        accounts.isRootEnabled,
        accounts.skipAccountCreation,
        isRootValid,
        isUserValid,
        setIsFormValid,
    ]);

    // Display custom footer
    const getFooter = useMemo(() => <CustomFooter />, []);
    useWizardFooter(getFooter);

    return (
        <Form
          isHorizontal
          id={idPrefix}
        >
            <CreateAccount
              idPrefix={idPrefix + "-create-account"}
              setIsUserValid={setIsUserValid}
              setAccounts={setAccounts}
            />
            <RootAccount
              idPrefix={idPrefix + "-root-account"}
              setIsRootValid={setIsRootValid}
              setAccounts={setAccounts}
            />
        </Form>
    );
};

const CustomFooter = () => {
    const accounts = useContext(UsersContext);

    const onNext = async ({ goToNextStep }) => {
        await applyAccounts(accounts);
        goToNextStep();
    };

    return (
        <AnacondaWizardFooter
          footerHelperText={(!accounts.isRootEnabled && accounts.skipAccountCreation) ? _("You have to enable the root account or create a local user account to proceed.") : null}
          onNext={onNext}
        />
    );
};
