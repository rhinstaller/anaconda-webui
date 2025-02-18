/*
 * Copyright (C) 2024 Red Hat, Inc.
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

import React, { useContext, useEffect } from "react";
import { FormSelect, FormSelectOption } from "@patternfly/react-core";

import { setCompositorLayouts } from "../../apis/localization.js";

import { LanguageContext } from "../../contexts/Common.jsx";

const _ = cockpit.gettext;

export const KeyboardSelector = ({ idPrefix }) => {
    const { compositorSelectedLayout, keyboardLayouts } = useContext(LanguageContext);
    const keyboards = keyboardLayouts;

    useEffect(() => {
        if (compositorSelectedLayout && keyboards.find(({ "layout-id": layoutId }) => layoutId?.v === compositorSelectedLayout)) {
            return;
        }
        if (keyboards.length > 0) {
            setCompositorLayouts({ layouts: [keyboards[0]["layout-id"]?.v] }); // Default layout without variant
        }
    }, [keyboards, compositorSelectedLayout]);

    const handleChange = (event) => {
        const { value } = event.target;

        setCompositorLayouts({ layouts: [value] });
    };

    const selectedValue =
        compositorSelectedLayout || (keyboards.length > 0 ? keyboards[0]["layout-id"]?.v : "");

    return (
        <FormSelect
          id={`${idPrefix}-keyboard-layouts`}
          onChange={handleChange}
          value={selectedValue}
        >
            {keyboards.map(({ description, "layout-id": layoutId }) => (
                <FormSelectOption
                  key={layoutId?.v}
                  label={description?.v || _("Unknown layout")}
                  value={layoutId?.v}
                />
            ))}
        </FormSelect>
    );
};
