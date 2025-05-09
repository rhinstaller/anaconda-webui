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
import {
    Alert,
    Button,
    Content,
    Flex,
    MenuGroup,
    MenuItem,
} from "@patternfly/react-core";

import {
    getKeyboardConfiguration,
    setCompositorLayouts,
    setXLayouts,
} from "../../apis/localization.js";

import { LanguageContext } from "../../contexts/Common.jsx";

import { MenuSearch } from "./Common.jsx";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-language";

const MenuOption = ({ idPrefix, keyboard, selectedKeyboard }) => {
    const { description, "is-common": isCommon, "layout-id": layoutId } = keyboard;
    const id = (
        idPrefix +
        "-keyboard-" +
        (isCommon.v ? "option-common-" : "option-alpha-") +
        layoutId?.v.replace(/[\s()]/g, "_")
    );
    const isSelected = layoutId?.v === selectedKeyboard;
    const scrollRef = (isSelected)
        ? (ref) => {
            if (ref) {
                ref.scrollIntoView({ block: "center" });
            }
        }
        : undefined;

    return (
        <MenuItem
          id={id}
          isSelected={isSelected}
          key={layoutId?.v}
          itemId={layoutId?.v}
          ref={scrollRef}
          style={isSelected ? { backgroundColor: "var(--pf-v5-c-menu__list-item--hover--BackgroundColor)" } : undefined}
        >
            {description.v}
        </MenuItem>
    );
};

export const KeyboardSelector = ({ idPrefix }) => {
    const [search, setSearch] = useState("");
    const { compositorSelectedLayout, keyboardLayouts } = useContext(LanguageContext);
    const keyboards = keyboardLayouts;

    if (!compositorSelectedLayout) {
        return null;
    }

    const onSearch = (keyboard) => {
        const searchLower = search.toLowerCase();
        const { description, "layout-id": layoutId } = keyboard;
        return (
            description.v.toLowerCase()
                    .includes(searchLower) ||
            layoutId?.v.toLowerCase()
                    .includes(searchLower)
        );
    };

    const getOptions = showCommon => keyboards
            .filter(onSearch)
            .filter(keyboard => keyboard["is-common"].v === showCommon)
            .map(keyboard => (
                <MenuOption
                  idPrefix={idPrefix}
                  key={keyboard["layout-id"].v}
                  keyboard={keyboard}
                  selectedKeyboard={compositorSelectedLayout}
                />
            ));

    const options = [
        <MenuGroup
          id={SCREEN_ID + "-common-keyboards"}
          key={SCREEN_ID + "-common-keyboards"}
          label={_("Suggested keyboards")}
          labelHeadingLevel="h3"
        >
            {getOptions(true)}
        </MenuGroup>,
        <MenuGroup
          id={SCREEN_ID + "-other-keyboards"}
          key={SCREEN_ID + "-other-keyboards"}
          label={_("Other keyboards")}
          labelHeadingLevel="h3"
        >
            {getOptions(false)}
        </MenuGroup>,
    ];

    return (
        <MenuSearch
          ariaLabelSearch={_("Search keyboard layout")}
          ariaLabelSearchClear={_("Clear search")}
          handleOnSelect={(_event, item) => {
              setCompositorLayouts({ layouts: [item] });
              setXLayouts({ layouts: [item] });
          }}
          menuType="keyboard"
          options={options}
          search={search}
          selection={compositorSelectedLayout}
          setSearch={setSearch}
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

const KeyboardNonGnome = ({ idPrefix }) => {
    const { compositorSelectedLayout, keyboardLayouts } = useContext(LanguageContext);
    const keyboards = keyboardLayouts;

    useEffect(() => {
        if (compositorSelectedLayout && keyboards.find(({ "layout-id": layoutId }) => layoutId?.v === compositorSelectedLayout)) {
            return;
        }

        setCompositorLayouts({ layouts: ["us"] });
        setXLayouts({ layouts: ["us"] });
    }, [keyboards, compositorSelectedLayout]);

    return (
        <KeyboardSelector idPrefix={idPrefix} />
    );
};

export const Keyboard = ({ idPrefix, isGnome, setIsFormValid }) => {
    if (isGnome) {
        return <KeyboardGnome setIsFormValid={setIsFormValid} />;
    } else {
        return <KeyboardNonGnome idPrefix={idPrefix} />;
    }
};
