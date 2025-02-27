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

import React, { useContext, useEffect, useState } from "react";
import { Alert, Button, Flex, FormSelect, FormSelectOption, Text } from "@patternfly/react-core";

import {
    getKeyboardConfiguration,
    setCompositorLayouts,
} from "../../apis/localization.js";

import { LanguageContext, SystemTypeContext } from "../../contexts/Common.jsx";

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

export const KeyboardGnome = ({ setIsFormValid }) => {
    const [keyboardAlert, setKeyboardAlert] = useState();
    const [vconsoleLayout, setVconsoleLayout] = useState();
    const [xlayouts, setXlayouts] = useState([]);

    useEffect(() => {
        const onFail = ex => {
            setIsFormValid(false);
            setKeyboardAlert(ex.message);
            setVconsoleLayout();
            setXlayouts([]);
        };
        const onSuccess = (res) => {
            const vconsole = res[1];
            const xlayouts = res[0];

            setVconsoleLayout(vconsole);
            setXlayouts(xlayouts);

            setIsFormValid(xlayouts.length === 1);
            if (xlayouts.length > 1) {
                setKeyboardAlert(_("More than one layout detected. Remove additional layouts to proceed"));
            } else {
                setKeyboardAlert();
            }
        };
        const onFocus = () => {
            getKeyboardConfiguration({ onFail, onSuccess });
        };
        onFocus();

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [setIsFormValid]);

    const layout = (
        xlayouts?.length === 1
            ? vconsoleLayout
            : xlayouts.length === 0
                ? _("Unusable layout")
                : cockpit.format(_("$0 layouts detected"), xlayouts.length)
    );

    return (
        <>
            <Flex alignItems="center" flexWrap={{ default: "nowrap" }}>
                <Text>{layout}</Text>
                <Button
                  variant="link"
                  component="a"
                  href="anaconda-gnome-control-center://keyboard"
                >
                    {_("Change system keyboard layout")}
                </Button>
            </Flex>
            {keyboardAlert &&
            <Alert
              isInline
              isPlain
              title={keyboardAlert}
              variant="danger"
            />}
        </>
    );
};

export const Keyboard = ({ idPrefix, setIsFormValid }) => {
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    return (
        isBootIso
            ? <KeyboardSelector idPrefix={idPrefix} />
            : <KeyboardGnome setIsFormValid={setIsFormValid} />
    );
};
