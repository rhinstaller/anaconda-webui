/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import {
    resolveEnvironment,
    setPackagesSelection,
} from "../../apis/payload_dnf.js";

import {
    getPayloadGroupsAction,
} from "../../actions/payload-dnf-actions.js";

import { PageContext, PayloadContext } from "../../contexts/Common.jsx";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { MenuSearch } from "../common/MenuSearch.jsx";

import "./SoftwareSelection.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-software-selection";

const EnvironmentSelection = ({
    environment,
    environments,
    onEnvironmentSelect,
    selectionError,
}) => {
    const options = useMemo(() => {
        if (!environments) {
            return [];
        }
        return environments.map((env) => ({
            id: `${SCREEN_ID}-environment-${env.id}`,
            itemDescription: env.description,
            itemId: env.id,
            itemText: env.name,
            itemType: "menu-item",
            key: `environment-${env.id}`,
            onSearch: (search) => {
                const searchLower = search.toLowerCase();
                return env.name.toLowerCase().includes(searchLower) ||
                       (env.description && env.description.toLowerCase().includes(searchLower));
            },
        }));
    }, [environments]);

    return (
        <FormGroup
          className="anaconda-screen-software-selection-form-group"
          label={_("Base environment")}
        >
            {selectionError && (
                <Alert
                  isInline
                  title={_("Failed to load the selected environment")}
                  variant="danger"
                >
                    {selectionError}
                </Alert>
            )}
            <MenuSearch
              ariaLabelSearch={_("Search for an environment")}
              handleOnSelect={(_ev, itemId) => onEnvironmentSelect(itemId)}
              menuType="environment"
              options={options}
              screenId={SCREEN_ID}
              selection={environment}
            />
        </FormGroup>
    );
};

const GroupPackagesSelection = ({
    groups,
    onGroupSelect,
    selectedGroups,
}) => {
    const groupOptions = useMemo(() => {
        if (!groups) {
            return [];
        }

        const optionalGroups = groups.filter(group => group.isOptional);
        const visibleGroups = groups.filter(group => !group.isOptional);

        const optionalGroupItems = optionalGroups.map((group) => ({
            id: `${SCREEN_ID}-group-${group.id}`,
            itemDescription: group.description,
            itemId: group.id,
            itemText: group.name,
            itemType: "menu-item",
            key: `group-${group.id}`,
            onSearch: (search) => {
                const searchLower = search.toLowerCase();
                return group.name.toLowerCase().includes(searchLower) ||
                       (group.description && group.description.toLowerCase().includes(searchLower));
            },
        }));

        const visibleGroupItems = visibleGroups.map((group) => ({
            id: `${SCREEN_ID}-group-${group.id}`,
            itemDescription: group.description,
            itemId: group.id,
            itemText: group.name,
            itemType: "menu-item",
            key: `group-${group.id}`,
            onSearch: (search) => {
                const searchLower = search.toLowerCase();
                return group.name.toLowerCase().includes(searchLower) ||
                       (group.description && group.description.toLowerCase().includes(searchLower));
            },
        }));

        const options = [];
        if (optionalGroupItems.length > 0) {
            options.push({
                id: `${SCREEN_ID}-optional-groups`,
                itemChildren: optionalGroupItems,
                itemLabel: _("Add-ons for your chosen environment"),
                itemType: "menu-group",
                key: "optional-groups",
            });
        }
        if (visibleGroupItems.length > 0) {
            options.push({
                id: `${SCREEN_ID}-visible-groups`,
                itemChildren: visibleGroupItems,
                itemLabel: _("Add-ons not specific to your environment"),
                itemType: "menu-group",
                key: "visible-groups",
            });
        }

        return options;
    }, [groups]);

    return (
        <FormGroup
          className="anaconda-screen-software-selection-form-group"
          label={_("Additional software for the selected environment")}
        >
            <MenuSearch
              ariaLabelSearch={_("Search for additional software")}
              handleOnSelect={(_ev, groupId) => onGroupSelect(groupId)}
              menuType="groups"
              options={groupOptions}
              screenId={SCREEN_ID}
              selection={selectedGroups}
            />
        </FormGroup>
    );
};

const SoftwareSelectionFooter = ({ applyCurrentSelection }) => {
    const { setIsFormDisabled } = useContext(PageContext) ?? {};

    const onNext = async ({ goToNextStep }) => {
        setIsFormDisabled?.(true);
        try {
            await applyCurrentSelection();
            goToNextStep();
        } catch {
            // Error alert is shown by applyCurrentSelection.
        } finally {
            setIsFormDisabled?.(false);
        }
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};

export const SoftwareSelection = ({ automatedInstall, dispatch }) => {
    const { setIsFormDisabled, setIsFormValid } = useContext(PageContext) ?? {};
    const { environments, groups, packagesKickstarted, selection } = useContext(PayloadContext);

    const [localSelection, setLocalSelection] = useState({
        environment: selection?.environment || "",
        groups: selection?.groups || [],
        isEnvironmentValid: Boolean(selection?.environment),
    });
    const [selectionError, setSelectionError] = useState(null);
    const [applyError, setApplyError] = useState(null);

    useEffect(() => {
        setIsFormDisabled?.(false);
    }, [setIsFormDisabled]);

    const handleEnvironmentSelect = useCallback(async (itemId) => {
        setSelectionError(null);
        setApplyError(null);

        try {
            const resolved = await resolveEnvironment(itemId);
            if (!resolved) {
                setSelectionError(_("The selected environment is not available from the current installation source."));
                setLocalSelection({ environment: "", groups: [], isEnvironmentValid: false });
                return;
            }

            setLocalSelection({
                environment: resolved,
                groups: [],
                isEnvironmentValid: true,
            });
            await dispatch(getPayloadGroupsAction(resolved));
        } catch (e) {
            setSelectionError(e.message || String(e));
            setLocalSelection(current => ({ ...current, isEnvironmentValid: false }));
        }
    }, [dispatch]);

    const handleGroupSelect = useCallback((groupId) => {
        setLocalSelection((current) => {
            const selectedGroups = current.groups || [];
            const nextGroups = selectedGroups.includes(groupId)
                ? selectedGroups.filter(id => id !== groupId)
                : [...selectedGroups, groupId];
            return { ...current, groups: nextGroups };
        });
    }, []);

    const applyCurrentSelection = useCallback(async () => {
        setApplyError(null);
        try {
            await setPackagesSelection({
                environment: localSelection.environment,
                groups: localSelection.groups || [],
            });
        } catch (e) {
            setApplyError(e.message || String(e));
            throw e;
        }
    }, [localSelection]);

    const footer = useMemo(
        () => <SoftwareSelectionFooter applyCurrentSelection={applyCurrentSelection} />,
        [applyCurrentSelection]
    );
    useWizardFooter(footer);

    useEffect(() => {
        const kickstarted =
            packagesKickstarted === true && automatedInstall === true;

        if (kickstarted && !localSelection.environment) {
            setIsFormValid(true);
            return;
        }
        if (!localSelection.environment) {
            setIsFormValid(false);
            return;
        }

        setIsFormValid(localSelection.isEnvironmentValid);
    }, [
        automatedInstall,
        localSelection.environment,
        localSelection.isEnvironmentValid,
        packagesKickstarted,
        setIsFormValid,
    ]);

    return (
        <Form>
            {applyError && (
                <Alert
                  isInline
                  title={_("Failed to save software selection")}
                  variant="danger"
                >
                    {applyError}
                </Alert>
            )}
            <Flex spaceItems={{ default: "spaceItemsXl" }}>
                <EnvironmentSelection
                  environment={localSelection.environment}
                  environments={environments}
                  onEnvironmentSelect={handleEnvironmentSelect}
                  selectionError={selectionError}
                />
                <GroupPackagesSelection
                  groups={groups}
                  onGroupSelect={handleGroupSelect}
                  selectedGroups={localSelection.groups || []}
                />
            </Flex>
        </Form>
    );
};
