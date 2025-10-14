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
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import {
    getKeyboardConfiguration,
    setCompositorLayouts,
    setVirtualConsoleKeymap,
    setXLayouts,
} from "../../apis/localization.js";

import { LanguageContext } from "../../contexts/Common.jsx";

import { MenuSearch } from "./Common.jsx";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-language";

const buildMenuItem = (keyboard) => {
    const {
        description,
        "is-common": isCommon,
        "layout-id": layoutId,
    } = keyboard;

    const id = (
        SCREEN_ID +
        "-keyboard-" +
        (isCommon.v ? "option-common-" : "option-alpha-") +
        layoutId?.v.replace(/[\s()]/g, "_")
    );

    return {
        id,
        item: keyboard,
        itemId: layoutId?.v,
        itemText: description.v,
        itemType: "menu-item",
        key: layoutId?.v,
        onSearch: search => {
            const searchLower = search.toLowerCase();
            return (
                description.v.toLowerCase().includes(searchLower) ||
                layoutId?.v.toLowerCase().includes(searchLower)
            );
        },
    };
};

const buildMenuGroup = (keyboards, showCommon) => ({
    id: SCREEN_ID + "-keyboard-group-" + (showCommon ? "common" : "other") + "-keyboards",
    itemChildren: keyboards
            // only offer layouts that support ASCII input, until we properly
            // handle switched layout configurations
            .filter(keyboard => keyboard["supports-ascii"]?.v === true)
            .filter(keyboard => keyboard["is-common"].v === showCommon)
            .map(keyboard => buildMenuItem(keyboard)),
    itemLabel: showCommon ? _("Suggested keyboards") : _("Other keyboards"),
    itemLabelHeadingLevel: "h3",
    itemType: "menu-group",
});

export const KeyboardSelector = () => {
    const { compositorSelectedLayout, keyboardLayouts } = useContext(LanguageContext);
    const keyboards = keyboardLayouts;

    if (!compositorSelectedLayout) {
        return null;
    }

    const options = [
        buildMenuGroup(keyboards, true),
        buildMenuGroup(keyboards, false),
    ];

    return (
        <MenuSearch
          ariaLabelSearch={_("Search keyboard layout")}
          handleOnSelect={(_event, item) => {
              setCompositorLayouts({ layouts: [item] });
              setVirtualConsoleKeymap({ keymap: item });
              setXLayouts({ layouts: [item] });
          }}
          menuType="keyboard"
          options={options}
          selection={compositorSelectedLayout}
        />
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
                <Content component="p">{layout}</Content>
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

const KeyboardNonGnome = () => {
    const { keyboardLayouts, virtualConsoleKeymap } = useContext(LanguageContext);
    const keyboards = keyboardLayouts;

    useEffect(() => {
        if (virtualConsoleKeymap && keyboards.find(({ "layout-id": layoutId }) => layoutId?.v === virtualConsoleKeymap)) {
            return;
        }

        setCompositorLayouts({ layouts: ["us"] });
        setVirtualConsoleKeymap({ keymap: "us" });
        setXLayouts({ layouts: ["us"] });
    }, [keyboards, virtualConsoleKeymap]);

    return (
        <KeyboardSelector />
    );
};

export const Keyboard = ({ isGnome, setIsFormValid }) => {
    if (isGnome) {
        return <KeyboardGnome setIsFormValid={setIsFormValid} />;
    } else {
        return <KeyboardNonGnome />;
    }
};
