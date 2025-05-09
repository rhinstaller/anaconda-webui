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
import React from "react";
import {
    Button,
    Menu,
    MenuContent,
    MenuList,
    TextInputGroup,
    TextInputGroupMain,
    TextInputGroupUtilities,
} from "@patternfly/react-core";
import { SearchIcon, TimesIcon } from "@patternfly/react-icons";

const SCREEN_ID = "anaconda-screen-language";

export const MenuSearch = ({ ariaLabelSearch, ariaLabelSearchClear, handleOnSelect, menuType, options, search, selection, setSearch }) => {
    const prefix = SCREEN_ID + "-" + menuType;

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
                          aria-label={ariaLabelSearchClear}
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
                        {options}
                    </MenuList>
                </MenuContent>
            </Menu>
        </>
    );
};
