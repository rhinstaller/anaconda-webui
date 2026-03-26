/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { debounce } from "throttle-debounce";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Form, FormGroup, FormHelperText, FormSection } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { InputGroup } from "@patternfly/react-core/dist/esm/components/InputGroup/index.js";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

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

/** Read-only summary when user(s) are specified by kickstart (like GTK User Creation greyed out). */
const UsersReadOnlySummary = ({ users }) => {
    if (!users?.length) return null;
    return (
        <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsSm" }}>
            {cockpit.ngettext(
                _("The following user will be created:"),
                _("The following users will be created:"),
                users.length
            )}
            <List isPlain>
                {users.map((u, i) => (
                    <ListItem
                      key={u.name ?? i}
                      data-testid={`accounts-users-readonly-user-${u.name ?? i}`}
                    >
                        {u.gecos ? `${u.gecos} (${u.name || ""})` : (u.name || "—")}
                    </ListItem>
                ))}
            </List>
        </Flex>
    );
};

/** Review step summary for account / root choices (see users `Page.review`). */
export const AccountsReviewDescription = () => {
    const accounts = useContext(UsersContext);
    const hasUsers = (accounts.users?.length ?? 0) > 0;
    const userSummary = hasUsers
        ? (
            <div data-testid="accounts-review-users">
                <UsersReadOnlySummary users={accounts.users} />
            </div>
        )
        : null;

    if (accounts.isRootEnabled && !hasUsers) {
        return _("Root account is enabled, but no user account has been configured");
    }
    if (!accounts.isRootEnabled && hasUsers) {
        return userSummary;
    }
    if (accounts.isRootEnabled && hasUsers) {
        return (
            <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsXs" }}>
                <div>{_("Root account is enabled")}</div>
                {userSummary}
            </Flex>
        );
    }
    return null;
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
    setAccounts,
    setIsUserValid,
    setSkipAccountCreation,
    skipAccountCreation,
}) => {
    const accounts = useContext(UsersContext);
    const firstUser = accounts.users?.[0] ?? {};
    const [fullName, setFullName] = useState(firstUser.gecos ?? "");
    const [checkFullName, setCheckFullName] = useState(firstUser.gecos ?? "");
    const [fullNameInvalidHint, setFullNameInvalidHint] = useState("");
    const [isFullNameValid, setIsFullNameValid] = useState(null);
    const [userName, setUserName] = useState(firstUser.name ?? "");
    const [checkUserName, setCheckUserName] = useState(firstUser.name ?? "");
    const [userNameInvalidHint, setUserNameInvalidHint] = useState("");
    const [isUserNameValid, setIsUserNameValid] = useState(null);
    const [password, setPassword] = useState(accounts.password);
    const [confirmPassword, setConfirmPassword] = useState(accounts.confirmPassword);
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const passwordPolicy = useContext(RuntimeContext).passwordPolicies.user;
    const [guessingUserName, setGuessingUserName] = useState(false);

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
        if (skipAccountCreation) {
            setAccounts({ confirmPassword, password, users: [] });
            return;
        }
        const first = { ...(accounts.users?.[0] ?? {}), gecos: fullName, name: userName };
        const users = accounts.users?.length
            ? [first, ...accounts.users.slice(1)]
            : (userName || fullName ? [first] : []);
        setAccounts({ confirmPassword, password, users });
    }, [
        accounts.users,
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

/**
 * Readonly "Root" section when root was specified via kickstart
 */
const RootAccountReadonly = ({ idPrefix, setIsRootValid }) => {
    const accounts = useContext(UsersContext);
    const isRootAccountEnabled = accounts.isRootEnabled;

    useEffect(() => {
        setIsRootValid(true);
    }, [setIsRootValid]);

    return (
        <FormSection title={_("System")}>
            <Checkbox
              id={idPrefix + "-enable-root-account"}
              label={_("Enable root account")}
              isChecked={isRootAccountEnabled}
              isDisabled
              onChange={() => {}}
              body={isRootAccountEnabled
                  ? (
                      <FormHelperText>
                          <HelperText>
                              <HelperTextItem variant="default">
                                  {_("Root password has been set.")}
                              </HelperTextItem>
                          </HelperText>
                      </FormHelperText>
                  )
                  : null}
            />
        </FormSection>
    );
};

const RootAccountEditable = ({
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

const RootAccount = ({ idPrefix, setAccounts, setIsRootValid }) => {
    const accounts = useContext(UsersContext);
    const canModifyRootConfiguration = accounts.canModifyRootConfiguration !== false;

    if (!canModifyRootConfiguration) {
        return (
            <RootAccountReadonly
              idPrefix={idPrefix}
              setIsRootValid={setIsRootValid}
            />
        );
    }
    return (
        <RootAccountEditable
          idPrefix={idPrefix}
          setAccounts={setAccounts}
          setIsRootValid={setIsRootValid}
        />
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
    const [skipAccountCreation, setSkipAccountCreation] = useState(false);

    const kickstartUsersReadOnly = accounts.usersSpecifiedByKickstart === true &&
        accounts.canModifyUserConfiguration === false;

    useEffect(() => {
        const skipRootCreation = !accounts.isRootEnabled;

        setIsFormValid(
            (skipAccountCreation || isUserValid || kickstartUsersReadOnly) &&
            (skipRootCreation || isRootValid) &&
            !(skipRootCreation && skipAccountCreation && !kickstartUsersReadOnly)
        );
    }, [
        accounts.isRootEnabled,
        accounts.canModifyUserConfiguration,
        accounts.usersSpecifiedByKickstart,
        isRootValid,
        isUserValid,
        setIsFormValid,
        skipAccountCreation,
        kickstartUsersReadOnly,
    ]);

    // Display custom footer
    const getFooter = useMemo(() => <CustomFooter />, []);
    useWizardFooter(getFooter);

    return (
        <Form
          isHorizontal
          id={idPrefix}
        >
            {kickstartUsersReadOnly
                ? (
                    <FormSection title={_("User creation")} data-testid="accounts-users-readonly">
                        <UsersReadOnlySummary users={accounts.users} />
                    </FormSection>
                )
                : (
                    <CreateAccount
                      idPrefix={idPrefix + "-create-account"}
                      setIsUserValid={setIsUserValid}
                      setAccounts={setAccounts}
                      setSkipAccountCreation={setSkipAccountCreation}
                      skipAccountCreation={skipAccountCreation}
                    />
                )}
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

    const onNext = ({ goToNextStep }) => {
        applyAccounts(accounts).then(goToNextStep);
    };

    const noUserAccount = (accounts.users?.length ?? 0) === 0;

    return (
        <AnacondaWizardFooter
          footerHelperText={(!accounts.isRootEnabled && noUserAccount) ? _("You have to enable the root account or create a local user account to proceed.") : null}
          onNext={onNext}
        />
    );
};
