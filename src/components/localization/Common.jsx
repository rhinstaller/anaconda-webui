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

import React, { useState } from "react";
import {
    Button,
    Menu,
    MenuContent,
    MenuGroup,
    MenuItem,
    MenuList,
    TextInputGroup,
    TextInputGroupMain,
    TextInputGroupUtilities,
} from "@patternfly/react-core";
import { SearchIcon, TimesIcon } from "@patternfly/react-icons";
const _ = cockpit.gettext;

const SCREEN_ID = "anaconda-screen-language";

const renderOptions = (options, selection, search) => {
    return options.map(option => {
        const isSelected = selection && option.itemId === selection;
        // Creating a ref that will be applied to the selected language and cause it to scroll into view.
        const scrollRef = (isSelected)
            ? (ref) => {
                if (ref) {
                    ref.scrollIntoView({ block: "center" });
                }
            }
            : undefined;

        switch (option.itemType) {
        case "menu-item":
            if (search && option.onSearch(search) === false) {
                return null; // Skip items that do not match the search criteria
            }

            return (
                <MenuItem
                  id={option.id}
                  isAriaDisabled={option.isAriaDisabled}
                  isSelected={isSelected}
                  itemId={option.itemId}
                  key={option.key || option.id}
                  ref={scrollRef}
                  style={isSelected ? { backgroundColor: "var(--pf-v6-c-menu__list-item--hover--BackgroundColor)" } : undefined}
                >
                    {option.itemLang
                        ? (
                            <div lang={option.itemLang}>
                                {option.itemText}
                            </div>
                        )
                        : option.itemText}
                </MenuItem>
            );
        case "menu-group": {
            const itemChildren = renderOptions(option.itemChildren, selection, search);

            if (itemChildren.filter((item) => item !== null).length === 0) {
                return null; // Skip empty groups
            }
            return (
                <MenuGroup
                  key={option.key || option.id}
                  id={option.id}
                  label={option.itemLabel}
                  labelHeadingLevel={option.itemLabelHeadingLevel}
                >
                    {itemChildren}
                </MenuGroup>
            );
        }
        default:
            console.warn(`Unknown item type: ${option.itemType}`);
            return null;
        }
    });
};

export const MenuSearch = ({ ariaLabelSearch, handleOnSelect, menuType, options, selection }) => {
    const [search, setSearch] = useState("");
    const prefix = SCREEN_ID + "-" + menuType;
    const menuListContent = renderOptions(options, selection, search);

    return (
        <>
            <TextInputGroup className={prefix + "-search"}>
                <TextInputGroupMain
                  icon={<SearchIcon />}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label={ariaLabelSearch}
                />
                {search && (
                    <TextInputGroupUtilities>
                        <Button
                          variant="plain"
                          onClick={() => setSearch("")}
                          aria-label={_("Clear search")}
                        >
                            <TimesIcon />
                        </Button>
                    </TextInputGroupUtilities>
                )}
            </TextInputGroup>
            <Menu
              className={prefix + "-menu"}
              id={prefix + "-menu"}
              isScrollable
              isPlain
              onSelect={handleOnSelect}
              aria-invalid={!selection}
            >
                <MenuContent>
                    <MenuList>
                        {menuListContent.filter((item) => item !== null).length > 0
                            ? (
                                menuListContent
                            )
                            : (
                                <MenuItem isAriaDisabled>
                                    {_("No results found")}
                                </MenuItem>
                            )}
                    </MenuList>
                </MenuContent>
            </Menu>
        </>
    );
};
