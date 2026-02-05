/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useContext, useEffect, useMemo } from "react";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import { getDefaultEnvironment, setPackagesSelection } from "../../apis/payload_dnf.js";

import { PayloadContext } from "../../contexts/Common.jsx";

import { MenuSearch } from "../common/MenuSearch.jsx";

import "./SoftwareSelection.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-software-selection";

const EnvironmentSelection = () => {
    const { environments, selection } = useContext(PayloadContext);
    const environment = selection?.environment;

    useEffect(() => {
        (async () => {
            if (!environment) {
                const defaultEnv = await getDefaultEnvironment();
                await setPackagesSelection({ environment: defaultEnv, groups: [] });
            }
        })();
    }, [environment]);

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

    const handleOnSelect = (_ev, itemId) => {
        // Reset groups selection when changing environment
        setPackagesSelection({ environment: itemId, groups: [] });
    };

    return (
        <FormGroup
          className="anaconda-screen-software-selection-form-group"
          label={_("Base environment")}
        >
            <MenuSearch
              ariaLabelSearch={_("Search for an environment")}
              handleOnSelect={handleOnSelect}
              menuType="environment"
              options={options}
              screenId={SCREEN_ID}
              selection={environment}
            />
        </FormGroup>
    );
};

const GroupPackagesSelection = () => {
    const { groups, selection } = useContext(PayloadContext);
    const selectedGroups = selection?.groups || [];

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

    const handleGroupSelect = async (_ev, groupId) => {
        // Toggle selection
        let newSelectedGroups;
        if (selectedGroups.includes(groupId)) {
            newSelectedGroups = selectedGroups.filter(id => id !== groupId);
        } else {
            newSelectedGroups = [...selectedGroups, groupId];
        }

        // Update packages selection
        await setPackagesSelection({ groups: newSelectedGroups });
    };

    return (
        <FormGroup
          className="anaconda-screen-software-selection-form-group"
          label={_("Additional software for the selected environment")}
        >
            <MenuSearch
              ariaLabelSearch={_("Search for additional software")}
              handleOnSelect={handleGroupSelect}
              menuType="groups"
              options={groupOptions}
              screenId={SCREEN_ID}
              selection={selectedGroups}
            />
        </FormGroup>
    );
};

export const SoftwareSelection = ({ setIsFormValid }) => {
    const { environments, groups, selection } = useContext(PayloadContext);
    const environment = selection?.environment;
    const selectedGroups = selection?.groups;

    useEffect(() => {
        setIsFormValid(
            !!environment && environments?.length > 0 &&
            groups?.length > 0 && selectedGroups?.length >= 0
        );
    }, [environment, environments, groups, selectedGroups?.length, setIsFormValid]);

    return (
        <Form>
            <Flex spaceItems={{ default: "spaceItemsXl" }}>
                <EnvironmentSelection />
                <GroupPackagesSelection />
            </Flex>
        </Form>
    );
};
