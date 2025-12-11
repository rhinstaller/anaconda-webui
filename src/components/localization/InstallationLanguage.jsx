/*
 * Copyright (C) 2022 Red Hat, Inc.
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
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";

import { setLocale } from "../../apis/boss.js";
import {
    setLanguage,
} from "../../apis/localization.js";

import {
    convertToCockpitLang,
    getLangCookie,
    setLangCookie
} from "../../helpers/language.js";
import { error as loggerError } from "../../helpers/log.js";

import { LanguageContext, SystemTypeContext } from "../../contexts/Common.jsx";

import { MenuSearch } from "../common/MenuSearch.jsx";
import { Keyboard } from "./Keyboard.jsx";

import "./InstallationLanguage.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-language";
const error = loggerError.bind(null, SCREEN_ID + ":");

const getLanguageEnglishName = lang => lang["english-name"].v;
const getLanguageNativeName = lang => lang["native-name"].v;
const getLocaleId = locale => locale["locale-id"].v;
const getLocaleNativeName = locale => locale["native-name"].v;

class LanguageSelector extends React.Component {
    constructor (props) {
        super(props);
        this.initiallySelectedLanguage = props.language;

        this.renderOptions = this.renderOptions.bind(this);
    }

    componentDidMount () {
        try {
            const cockpitLang = convertToCockpitLang({ lang: this.props.language });
            if (getLangCookie() !== cockpitLang) {
                setLangCookie({ cockpitLang });
                window.location.reload(true);
            }
            setLocale({ locale: this.props.language });
        } catch (e) {
            this.props.setStepNotification(e);
        }
    }

    renderOptions () {
        const { commonLocales, languages } = this.props;
        const options = [];

        // Returns a locale with a given code.
        const findLocaleWithId = (localeCode) => {
            for (const languageId in languages) {
                const languageItem = languages[languageId];
                for (const locale of languageItem.locales) {
                    if (getLocaleId(locale) === localeCode) {
                        return locale;
                    }
                }
            }
            error(`Locale with code ${localeCode} not found.`);
        };

        const onSearch = (locale, search) => {
            const searchLower = search.toLowerCase();

            return (
                getLocaleNativeName(locale).toLowerCase()
                        .includes(searchLower) ||
                getLanguageNativeName(locale).toLowerCase()
                        .includes(searchLower) ||
                getLanguageEnglishName(locale).toLowerCase()
                        .includes(searchLower)
            );
        };

        // Helper to create a menu item
        const createMenuItem = (locale, prefix) => {
            return ({
                id: `${SCREEN_ID}-language-${prefix}-${getLocaleId(locale).split(".UTF-8")[0]}`,
                item: locale,
                itemId: getLocaleId(locale),
                itemLang: convertToCockpitLang({ lang: getLocaleId(locale) }),
                itemText: getLocaleNativeName(locale),
                itemType: "menu-item",
                key: `${prefix}-${getLocaleId(locale)}`,
                onSearch: onSearch.bind(null, locale),
            });
        };

        const suggestedItems = commonLocales
                .map(findLocaleWithId)
                .sort((a, b) => {
                    if (!a || !b) {
                        return 0;
                    }
                    // Sort alphabetically by native name but keep the default locale at the top
                    if (getLocaleId(a) === this.initiallySelectedLanguage) {
                        return -1;
                    } else if (getLocaleId(b) === this.initiallySelectedLanguage) {
                        return 1;
                    }
                    return getLocaleNativeName(a).localeCompare(getLocaleNativeName(b));
                })
                .map(locale => createMenuItem(locale, "option-common"));

        if (suggestedItems.length > 0) {
            options.push({
                id: `${SCREEN_ID}-common-languages`,
                itemChildren: suggestedItems,
                itemLabel: _("Suggested languages"),
                itemLabelHeadingLevel: "h3",
                itemType: "menu-group",
            });
        }

        const otherItems = Object.keys(languages)
                .sort((a, b) => {
                    return getLanguageNativeName(languages[a].locales[0]).localeCompare(getLanguageNativeName(languages[b].locales[0]));
                })
                .flatMap(languageId => {
                    const languageItem = languages[languageId];
                    return languageItem.locales;
                })
                .filter(locale => commonLocales.indexOf(getLocaleId(locale)) === -1)
                .map(locale => createMenuItem(locale, "option-alpha"));

        if (otherItems.length > 0) {
            options.push({
                id: `${SCREEN_ID}-additional-languages`,
                itemChildren: otherItems,
                itemLabel: _("Additional languages"),
                itemLabelHeadingLevel: "h3",
                itemType: "menu-group",
            });
        }

        return options;
    }

    render () {
        const { languages } = this.props;

        const handleOnSelect = async (_event, item) => {
            for (const languageItem in languages) {
                for (const localeItem of languages[languageItem].locales) {
                    if (getLocaleId(localeItem) === item) {
                        setLangCookie({ cockpitLang: convertToCockpitLang({ lang: getLocaleId(localeItem) }) });
                        try {
                            await setLanguage({ lang: getLocaleId(localeItem) });
                            setLocale({ locale: getLocaleId(localeItem) });
                        } catch (ex) {
                            this.props.setStepNotification(ex);
                        }
                        this.setState({ lang: item });
                        try {
                            const response = await fetch("po.js");
                            const body = await response.text();
                            // always reset old translations
                            cockpit.locale(null);
                            // en_US is always null
                            if (body.trim() === "") {
                                cockpit.locale({
                                    "": {
                                        language: "en_US",
                                        "language-direction": "ltr",
                                    }
                                });
                            } else {
                                // eslint-disable-next-line no-eval
                                eval(body);
                            }

                            const langEvent = new CustomEvent("cockpit-lang");
                            window.dispatchEvent(langEvent);
                        } catch (ex) {
                            // Silently handle fetch errors
                        }
                        return;
                    }
                }
            }
        };

        const options = this.renderOptions();

        return (
            <MenuSearch
              ariaLabelSearch={_("Search for a language")}
              handleOnSelect={handleOnSelect}
              menuType="language"
              options={options}
              screenId={SCREEN_ID}
              selection={this.props.language}
            />
        );
    }
}

export const InstallationLanguage = ({ dispatch, setIsFormValid, setStepNotification }) => {
    const { commonLocales, keyboardLayouts, language, languages } = useContext(LanguageContext);
    const { desktopVariant } = useContext(SystemTypeContext);
    const isGnome = desktopVariant === "GNOME";
    const [isLanguageValid, setIsLanguageValid] = useState(false);
    const [isKeyboardValid, setIsKeyboardValid] = useState(false);

    useEffect(() => {
        setIsLanguageValid(language !== "");
    }, [language, setIsFormValid]);

    useEffect(() => {
        setIsFormValid(isLanguageValid && isKeyboardValid);
    }, [isLanguageValid, isKeyboardValid, setIsFormValid]);

    return (
        <>
            <Form isHorizontal>
                <FormGroup
                  className="anaconda-screen-selectors-container"
                  label={_("Language")}
                >
                    <LanguageSelector
                      id="language-selector"
                      languages={languages}
                      commonLocales={commonLocales}
                      language={language}
                      setIsFormValid={setIsFormValid}
                      setStepNotification={setStepNotification}
                    />
                </FormGroup>

                {keyboardLayouts.length > 0 && (
                    <FormGroup
                      className={!isGnome ? "anaconda-screen-selectors-container" : ""}
                      fieldId={`${SCREEN_ID}-keyboard-layouts`}
                      label={_("Keyboard")}
                    >
                        <Keyboard
                          dispatch={dispatch}
                          isGnome={isGnome}
                          setIsKeyboardValid={setIsKeyboardValid}
                          setStepNotification={setStepNotification}
                        />
                    </FormGroup>
                )}
            </Form>
        </>
    );
};
