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

import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    FormGroup,
    FormHelperText,
    FormSection,
    HelperText,
    HelperTextItem,
    InputGroup,
    InputGroupItem,
    TextInput,
} from "@patternfly/react-core";
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    EyeSlashIcon
} from "@patternfly/react-icons";

// eslint-disable-next-line camelcase
import { password_quality } from "cockpit-components-password.jsx";

const _ = cockpit.gettext;

export const ruleLength = {
    check: (policy, password) => password.length >= policy["min-length"].v,
    id: "length",
    isError: true,
    text: (policy) => cockpit.format(_("Must be at least $0 characters"), policy["min-length"].v),
};

/* Calculate the password quality levels based on the password policy
 * If the policy specifies a 'is-strict' rule anything bellow the minimum specified by the policy
 * is considered invalid
 * @param {int} minQualility - the minimum quality level
 * @return {array} - the password strengh levels
 */
const getStrengthLevels = (minQualility, isStrict) => {
    const levels = [{
        higher_bound: minQualility - 1,
        icon: <ExclamationCircleIcon />,
        id: "weak",
        label: _("Weak"),
        lower_bound: 0,
        valid: !isStrict,
        variant: "error",
    }];

    if (minQualility <= 69) {
        levels.push({
            higher_bound: 69,
            icon: <ExclamationTriangleIcon />,
            id: "medium",
            label: _("Medium"),
            lower_bound: minQualility,
            valid: true,
            variant: "warning",
        });
    }

    levels.push({
        higher_bound: 100,
        icon: <CheckCircleIcon />,
        id: "strong",
        label: _("Strong"),
        lower_bound: Math.max(70, minQualility),
        valid: true,
        variant: "success",
    });

    return levels;
};

const getRuleResults = (rules, policy, password) => {
    return rules.map(rule => {
        return {
            id: rule.id,
            isError: rule.isError,
            isSatisfied: password.length > 0 ? rule.check(policy, password) : null,
            text: rule.text(policy, password)
        };
    });
};

const rulesSatisfied = ruleResults => ruleResults.every(r => r.isSatisfied || !r.isError);

const passwordStrengthLabel = (idPrefix, strength, strengthLevels) => {
    const level = strengthLevels.filter(l => l.id === strength)[0];
    if (level) {
        return (
            <HelperText>
                <HelperTextItem id={idPrefix + "-password-strength-label"} variant={level.variant} icon={level.icon}>
                    {level.label}
                </HelperTextItem>
            </HelperText>
        );
    }
};

export const PasswordFormFields = ({
    confirmPassword,
    confirmPasswordLabel,
    idPrefix,
    password,
    passwordLabel,
    passwordRef,
    policy,
    rules,
    sectionDescription,
    setConfirmPassword,
    setIsValid,
    setPassword,
}) => {
    const [passwordHidden, setPasswordHidden] = useState(true);
    const [confirmHidden, setConfirmHidden] = useState(true);
    const [checkPassword, setCheckPassword] = useState(password);
    const [checkConfirmPassword, setCheckConfirmPassword] = useState(confirmPassword);
    const [passwordStrength, setPasswordStrength] = useState("");

    useEffect(() => {
        debounce(300, () => setCheckPassword(password))();
    }, [password, setCheckPassword]);

    useEffect(() => {
        debounce(300, () => setCheckConfirmPassword(confirmPassword))();
    }, [confirmPassword, setCheckConfirmPassword]);

    const ruleResults = useMemo(() => {
        return getRuleResults(rules, policy, checkPassword);
    }, [policy, checkPassword, rules]);

    const ruleConfirmMatches = checkPassword.length > 0 ? checkPassword === checkConfirmPassword : null;

    const ruleHelperItems = ruleResults.map(rule => {
        let variant = rule.isSatisfied === null ? "indeterminate" : rule.isSatisfied ? "success" : "error";
        if (!rule.isError) {
            if (rule.isSatisfied || rule.isSatisfied === null) {
                return null;
            }
            variant = "warning";
        }
        return (
            <HelperTextItem
              key={rule.id}
              id={idPrefix + "-password-rule-" + rule.id}
              variant={variant}
              component="li"
            >
                {rule.text}
            </HelperTextItem>
        );
    });

    const ruleConfirmVariant = ruleConfirmMatches === null ? "indeterminate" : ruleConfirmMatches ? "success" : "error";

    const strengthLevels = useMemo(() => {
        return policy && getStrengthLevels(policy["min-quality"].v, policy["is-strict"].v);
    }, [policy]);

    useEffect(() => {
        const updatePasswordStrength = async () => {
            const _passwordStrength = await getPasswordStrength(checkPassword, strengthLevels);
            setPasswordStrength(_passwordStrength);
        };
        updatePasswordStrength();
    }, [checkPassword, strengthLevels]);

    useEffect(() => {
        setIsValid(
            rulesSatisfied(ruleResults) &&
            ruleConfirmMatches &&
            isValidStrength(passwordStrength, strengthLevels)
        );
    }, [setIsValid, ruleResults, ruleConfirmMatches, passwordStrength, strengthLevels]);

    return (
        <FormSection>
            {sectionDescription}
            <FormGroup
              isRequired
              label={passwordLabel}
              labelInfo={rulesSatisfied(ruleResults) && passwordStrengthLabel(idPrefix, passwordStrength, strengthLevels)}
            >
                <InputGroup>
                    <InputGroupItem isFill>
                        <TextInput
                          type={passwordHidden ? "password" : "text"}
                          value={password}
                          onChange={(_event, val) => setPassword(val)}
                          id={idPrefix + "-password-field"}
                          ref={passwordRef}
                        />
                    </InputGroupItem>
                    <InputGroupItem>
                        <Button
                          variant="control"
                          onClick={() => setPasswordHidden(!passwordHidden)}
                          aria-label={passwordHidden ? _("Show password") : _("Hide password")}
                        >
                            {passwordHidden ? <EyeIcon /> : <EyeSlashIcon />}
                        </Button>
                    </InputGroupItem>
                </InputGroup>
                <FormHelperText>
                    <HelperText component="ul" aria-live="polite" id={idPrefix + "-password-field-helper"}>
                        {ruleHelperItems}
                    </HelperText>
                </FormHelperText>
            </FormGroup>
            <FormGroup
              isRequired
              label={confirmPasswordLabel}
            >
                <InputGroup>
                    <InputGroupItem isFill><TextInput
                      type={confirmHidden ? "password" : "text"}
                      value={confirmPassword}
                      onChange={(_event, val) => setConfirmPassword(val)}
                      id={idPrefix + "-password-confirm-field"}
                    />
                    </InputGroupItem>
                    <InputGroupItem>
                        <Button
                          variant="control"
                          onClick={() => setConfirmHidden(!confirmHidden)}
                          aria-label={confirmHidden ? _("Show confirmed password") : _("Hide confirmed password")}
                        >
                            {confirmHidden ? <EyeIcon /> : <EyeSlashIcon />}
                        </Button>
                    </InputGroupItem>
                </InputGroup>
                <FormHelperText>
                    <HelperText component="ul" aria-live="polite" id="password-confirm-field-helper">
                        <HelperTextItem
                          id={idPrefix + "-password-rule-match"}
                          variant={ruleConfirmVariant}
                          component="li"
                        >
                            {_("Passphrases must match")}
                        </HelperTextItem>
                    </HelperText>
                </FormHelperText>
            </FormGroup>
        </FormSection>
    );
};

const getPasswordStrength = async (password, strengthLevels) => {
    // In case of unacceptable password just return 0
    const force = true;
    const quality = await password_quality(password, force);
    const level = strengthLevels.filter(l => l.lower_bound <= quality.value && l.higher_bound >= quality.value)[0];
    return level.id;
};

const isValidStrength = (strength, strengthLevels) => {
    const level = strengthLevels.filter(l => l.id === strength)[0];

    return level ? level.valid : false;
};
