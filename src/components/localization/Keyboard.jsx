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

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { List, ListItem } from "@patternfly/react-core/dist/esm/components/List/index.js";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Tooltip } from "@patternfly/react-core/dist/esm/components/Tooltip/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Grid, GridItem } from "@patternfly/react-core/dist/esm/layouts/Grid/index.js";
import ArrowDownIcon from "@patternfly/react-icons/dist/esm/icons/arrow-down-icon";
import ArrowUpIcon from "@patternfly/react-icons/dist/esm/icons/arrow-up-icon";
import StarIcon from "@patternfly/react-icons/dist/esm/icons/star-icon";
import TrashIcon from "@patternfly/react-icons/dist/esm/icons/trash-icon";

import {
    setCompositorLayouts,
    setXKeyboardDefaults,
    setXLayouts,
} from "../../apis/localization.js";

import {
    getKeyboardConfigurationAction,
} from "../../actions/localization-actions.js";

import { getLocaleById } from "../../helpers/localization.js";

import { LanguageContext } from "../../contexts/Common.jsx";

import { MenuSearch } from "./Common.jsx";

import "./Keyboard.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-language";

const SelectedKeyboards = ({ xlayouts }) => (
    <Content component="p">
        {xlayouts.length === 1
            ? xlayouts[0]
            : (
                <span>
                    <strong>{xlayouts[0]}</strong>
                    {xlayouts.slice(1).map((layout, index) => (
                        <span key={`${layout}-${index}`}>, {layout}</span>
                    ))}
                </span>
            )}
    </Content>
);

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
            .filter(keyboard => keyboard["is-common"].v === showCommon)
            .map(keyboard => buildMenuItem(keyboard)),
    itemLabel: showCommon ? _("Suggested keyboards") : _("Other keyboards"),
    itemLabelHeadingLevel: "h3",
    itemType: "menu-group",
});

const moveIndex = (arr, from, to) => {
    if (to < 0 || to >= arr.length) return arr;
    const newArray = arr.slice();
    const [movedItem] = newArray.splice(from, 1);
    newArray.splice(to, 0, movedItem);
    return newArray;
};
const uniqPush = (arr, id) => (arr.includes(id) ? arr : [...arr, id]);

const LayoutActionButtons = ({ index, modalId, setSelected, totalItems }) => {
    const cssClasses = {
        actions: "change-system-keyboard-layout-modal-actions"
    };

    const makeCurrent = (currentIndex) => setSelected(selected => moveIndex(selected, currentIndex, 0));
    const moveUp = (currentIndex) => setSelected(selected => moveIndex(selected, currentIndex, currentIndex - 1));
    const moveDown = (currentIndex) => setSelected(selected => moveIndex(selected, currentIndex, currentIndex + 1));
    const removeAt = (currentIndex) => setSelected(selected => selected.filter((_, idx) => idx !== currentIndex));

    return (
        <div className={cssClasses.actions}>
            <Tooltip content={_("Make current")}>
                <Button
                  id={`${modalId}-make-current-${index}`}
                  variant="plain"
                  aria-label={_("Make current")}
                  isDisabled={index === 0}
                  onClick={() => makeCurrent(index)}
                >
                    <StarIcon />
                </Button>
            </Tooltip>
            <Tooltip content={_("Move up")}>
                <Button
                  id={`${modalId}-move-up-${index}`}
                  variant="plain"
                  aria-label={_("Move up")}
                  isDisabled={index === 0}
                  onClick={() => moveUp(index)}
                >
                    <ArrowUpIcon />
                </Button>
            </Tooltip>
            <Tooltip content={_("Move down")}>
                <Button
                  id={`${modalId}-move-down-${index}`}
                  variant="plain"
                  aria-label={_("Move down")}
                  isDisabled={index === totalItems - 1}
                  onClick={() => moveDown(index)}
                >
                    <ArrowDownIcon />
                </Button>
            </Tooltip>
            <Tooltip content={_("Remove")}>
                <Button
                  id={`${modalId}-remove-${index}`}
                  variant="plain"
                  aria-label={_("Remove")}
                  onClick={() => removeAt(index)}
                >
                    <TrashIcon />
                </Button>
            </Tooltip>
        </div>
    );
};

const KeyboardDialog = ({ currentLayouts = [], onClose, onSaved }) => {
    const modalId = SCREEN_ID + "-change-system-keyboard-layout-modal";
    const cssClasses = {
        listRow: "change-system-keyboard-layout-modal-list-row"
    };
    const [alert, setAlert] = useState();
    const [selected, setSelected] = useState(currentLayouts);
    const { keyboardLayouts } = useContext(LanguageContext);

    const currentLocale = getLocaleById(keyboardLayouts, selected?.[0]);
    const currentSupportsAscii = currentLocale?.["supports-ascii"]?.v === true;

    const options = useMemo(
        () => [buildMenuGroup(keyboardLayouts, true), buildMenuGroup(keyboardLayouts, false)],
        [keyboardLayouts]
    );

    useEffect(() => {
        setAlert();
    }, [selected]);

    const addLayout = (_e, item) => {
        const id = typeof item === "string" ? item : item?.itemId || item?.key;
        if (id) {
            setSelected(selected => uniqPush(selected, id));
        }
    };

    const saveAll = async () => {
        try {
            onSaved?.(selected);
            onClose();
        } catch (e) {
            setAlert(e?.message || _("Failed to save layouts"));
        }
    };

    return (
        <Modal
          id={modalId}
          isOpen
          position="top"
          variant={ModalVariant.large}
        >
            <ModalHeader title={_("Change system keyboard layout")} />
            <ModalBody>
                <Grid hasGutter>
                    <GridItem span={7}>
                        <Content component={ContentVariants.h4}>
                            {_("Find layout")}
                        </Content>
                        <div id={modalId + "-left-panel"}>
                            <MenuSearch
                              ariaLabelSearch={_("Search keyboard layout")}
                              handleOnSelect={addLayout}
                              menuType="keyboard"
                              options={options}
                            />
                        </div>
                    </GridItem>

                    <GridItem span={5}>
                        <Content component={ContentVariants.h4}>
                            {_("Selected (top = current)")}
                        </Content>
                        <Divider />
                        <div id={modalId + "-right-panel"}>
                            {selected.length === 0
                                ? (
                                    <Content component={ContentVariants.p}>
                                        {_("No layouts selected yet")}
                                    </Content>
                                )
                                : (
                                    <List id={modalId + "-list"} isPlain>
                                        {selected.map((id, idx) => (
                                            <ListItem key={`${id}-${idx}`}>
                                                <div className={cssClasses.listRow}>
                                                    <Label color={idx === 0 ? "green" : "grey"}>{id}</Label>
                                                    <LayoutActionButtons
                                                      index={idx}
                                                      totalItems={selected.length}
                                                      setSelected={setSelected}
                                                      modalId={modalId}
                                                    />
                                                </div>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}

                            {selected.length > 0 && !currentSupportsAscii && (
                                <Alert isInline variant="warning" title={_("The selected default keyboard layout does not support ASCII characters. Please choose an ASCII-capable layout as the default.")} />
                            )}
                            {alert && <Alert isInline isPlain title={alert} variant="info" />}
                        </div>
                    </GridItem>
                </Grid>
            </ModalBody>
            <ModalFooter>
                <Button
                  id={modalId + "-save-button"}
                  key="save"
                  variant="primary"
                  isDisabled={selected.length < 1}
                  onClick={saveAll}
                >
                    {_("Save")}
                </Button>
                <Button key="cancel" variant="link" onClick={onClose}>
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export const KeyboardGnome = ({ dispatch }) => {
    const [keyboardAlert, setKeyboardAlert] = useState();
    const { plannedXlayouts } = useContext(LanguageContext);

    useEffect(() => {
        if (plannedXlayouts?.length > 1) {
            setKeyboardAlert(_("More than one layout detected. Remove additional layouts to proceed"));
        } else {
            setKeyboardAlert();
        }
    }, [plannedXlayouts]);

    useEffect(() => {
        const onFocus = () => {
            dispatch(getKeyboardConfigurationAction());
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [dispatch]);

    return (
        <>
            <Flex alignItems="center" flexWrap={{ default: "nowrap" }}>
                <SelectedKeyboards xlayouts={plannedXlayouts} />
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
    const modalId = SCREEN_ID + "-change-system-keyboard-layout-modal";
    const [keyboardAlert, setKeyboardAlert] = useState();
    const [open, setOpen] = useState(false);
    const { language, plannedXlayouts, xlayouts } = useContext(LanguageContext);
    const langRef = useRef(language);

    useEffect(() => {
        // On initial load, if no X layouts, set sensible defaults
        if (xlayouts?.length > 0) {
            return;
        }
        setXKeyboardDefaults();
    }, [xlayouts]);

    useEffect(() => {
        // When language changes, choose sensible defaults for X keyboard layouts
        if (langRef.current === language) {
            return;
        }
        langRef.current = language;
        setXKeyboardDefaults();
    }, [language]);

    const handleSaved = async (selectedLayouts) => {
        try {
            await setCompositorLayouts({ layouts: selectedLayouts });
            await setXLayouts({ layouts: selectedLayouts });
        } catch (ex) {
            setKeyboardAlert(ex?.message);
        }
    };

    const selectedKeyboards = <SelectedKeyboards xlayouts={plannedXlayouts} />;

    return (
        <>
            <Flex alignItems="center" flexWrap={{ default: "nowrap" }}>
                {selectedKeyboards}
                <Button
                  id={modalId + "-open-button"}
                  variant="link"
                  onClick={() => setOpen(true)}
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
            {open &&
            <KeyboardDialog
              onClose={() => setOpen(false)}
              onSaved={handleSaved}
              currentLayouts={plannedXlayouts}
            />}
        </>
    );
};

export const Keyboard = ({ dispatch, isGnome, setIsKeyboardValid, setStepNotification }) => {
    const { plannedVconsole, plannedXlayouts } = useContext(LanguageContext);

    useEffect(() => {
        setIsKeyboardValid((plannedVconsole ?? "") !== "" && (!isGnome || plannedXlayouts?.length === 1));
    }, [plannedVconsole, plannedXlayouts, isGnome, setIsKeyboardValid]);

    if (!plannedXlayouts?.length) {
        return null;
    }

    const keyboardAlert = (
        <Alert
          isInline
          isPlain
          title={_("No valid VConsole keymap can be obtained for the selected keyboard layout(s). Please make a different keyboard layout selection.")}
          variant="danger"
        />
    );
    const keyboard = (
        isGnome
            ? <KeyboardGnome dispatch={dispatch} />
            : <KeyboardNonGnome setStepNotification={setStepNotification} />
    );

    return (
        <>
            {keyboard}
            {plannedVconsole === "" && keyboardAlert}
        </>
    );
};
