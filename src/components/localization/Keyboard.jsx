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

import { LanguageContext } from "../../contexts/Common.jsx";
import { setCompositorSelectedLayout } from "../../apis/localization.js";

const _ = cockpit.gettext;

export const KeyboardSelector = ({ idPrefix }) => {
    const { compositorSelectedLayout, keyboardLayouts } = useContext(LanguageContext);
    const keyboards = keyboardLayouts;
    const selectedKeyboard = compositorSelectedLayout;

    useEffect(() => {
        // Ensure the selected keyboard is valid or reset to the default layout
        if (keyboards.length > 0) {
            const selectedLayoutId = selectedKeyboard?.split(":")[0];
            const isKeyboardValid = keyboards.some(
                ({ "layout-id": layoutId }) => layoutId?.v === selectedLayoutId
            );

            // Reset to default if current selection is invalid
            if (!isKeyboardValid) {
                setCompositorSelectedLayout({ layout: keyboards[0]["layout-id"]?.v }); // Default layout without variant
            }
        }
    }, [keyboards, selectedKeyboard, setCompositorSelectedLayout]);

    const handleChange = (event) => {
        const { value } = event.target;
        setCompositorSelectedLayout({ layout: value });
    };

    const selectedValue =
        selectedKeyboard || (keyboards.length > 0 ? keyboards[0]["layout-id"]?.v : "");

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
