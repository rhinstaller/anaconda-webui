/*
 * Copyright (C) 2025 Red Hat, Inc.
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

import React, { useContext, useEffect, useMemo } from "react";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";

import { getDefaultEnvironment, setPackagesSelection } from "../../apis/payload_dnf.js";

import { PayloadContext } from "../../contexts/Common.jsx";

import { MenuSearch } from "../common/MenuSearch.jsx";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-software-selection";

export const SoftwareSelection = ({ setIsFormValid }) => {
    const { environments, selection } = useContext(PayloadContext);
    const environment = selection?.environment;

    useEffect(() => {
        (async () => {
            if (!environment) {
                const defaultEnv = await getDefaultEnvironment();
                await setPackagesSelection({ environment: defaultEnv });
            }
        })();
    }, [environment]);

    useEffect(() => {
        setIsFormValid(!!environment && environments?.length > 0);
    }, [environment, environments, setIsFormValid]);

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
        setPackagesSelection({ environment: itemId });
    };

    return (
        <Form isHorizontal>
            <FormGroup
              className="anaconda-screen-selectors-container"
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
        </Form>
    );
};
