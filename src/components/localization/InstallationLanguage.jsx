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
import {
    Alert, Button,
    Form,
    FormGroup,
    Menu,
    MenuContent,
    MenuGroup,
    MenuItem,
    MenuList,
    Panel, PanelHeader,
    PanelMain,
    PanelMainBody,
    TextInputGroup,
    TextInputGroupMain,
    TextInputGroupUtilities,
    Title,
} from "@patternfly/react-core";
import { CheckIcon, SearchIcon } from "@patternfly/react-icons";
import TimesIcon from "@patternfly/react-icons/dist/esm/icons/times-icon";

import { setLocale } from "../../apis/boss.js";
import {
    setLanguage,
} from "../../apis/localization.js";

import {
    convertToCockpitLang,
    getLangCookie,
    setLangCookie
} from "../../helpers/language.js";

import { LanguageContext, OsReleaseContext } from "../Common.jsx";

import "./InstallationLanguage.scss";

const _ = cockpit.gettext;

const getLanguageEnglishName = lang => lang["english-name"].v;
const getLocaleId = locale => locale["locale-id"].v;
const getLocaleNativeName = locale => locale["native-name"].v;

class LanguageSelector extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            search: "",
        };

        this.updateNativeName = this.updateNativeName.bind(this);
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

    async updateNativeName (localeItem) {
        this.props.setNativeName(getLocaleNativeName(localeItem));
    }

    renderOptions (filter) {
        const { commonLocales, languages } = this.props;
        const idPrefix = this.props.idPrefix;

        const filtered = [];
        const filterLow = filter.toLowerCase();

        let foundSelected = false;

        // Helper to find locale by ID
        const findLocaleWithId = (localeCode) => {
            for (const languageId in languages) {
                const languageItem = languages[languageId];
                for (const locale of languageItem.locales) {
                    if (getLocaleId(locale) === localeCode) {
                        return locale;
                    }
                }
            }
            return null;
        };

        // Helper to create a menu item
        const createMenuItem = (locale, prefix) => {
            const isSelected = this.props.language === getLocaleId(locale);

            // Scroll into view if selected and not already scrolled
            const scrollRef = (isSelected && !foundSelected)
                ? (ref) => {
                    if (ref) {
                        ref.scrollIntoView({ block: "center" });
                        foundSelected = true;
                    }
                }
                : undefined;

            return (
                <MenuItem
                  id={`${idPrefix}-${prefix}-${getLocaleId(locale).split(".UTF-8")[0]}`}
                  key={`${prefix}-${getLocaleId(locale)}`}
                  itemId={getLocaleId(locale)}
                  ref={scrollRef}
                  style={isSelected ? { backgroundColor: "var(--pf-v5-c-menu__list-item--hover--BackgroundColor)" } : undefined}
                >
                    <div id="language-item">
                        <div>
                            <span>{getLocaleNativeName(locale)}</span>
                            {isSelected && (
                                <span id="selected-icon" aria-hidden="true">
                                    <CheckIcon />
                                </span>
                            )}
                        </div>
                        <span id="item-translation">
                            {getLanguageEnglishName(locale)}
                        </span>
                    </div>
                </MenuItem>
            );
        };

        // List suggested languages (filtered by search if applicable)
        const suggestedItems = commonLocales
                .map(findLocaleWithId)
                .filter(locale => locale && (
                    getLocaleNativeName(locale).toLowerCase()
                            .includes(filterLow) ||
                getLanguageEnglishName(locale).toLowerCase()
                        .includes(filterLow)
                ))
                .map(locale => createMenuItem(locale, "option-common-"));

        if (suggestedItems.length > 0) {
            filtered.push(
                <React.Fragment key="group-common-languages">
                    <MenuGroup
                      label={_("Suggested languages")}
                      id={idPrefix + "-common-languages"}
                      labelHeadingLevel="h3"
                    >
                        {suggestedItems}
                    </MenuGroup>
                </React.Fragment>
            );
        }

        // List other languages (filtered by search if applicable)
        const otherItems = Object.keys(languages)
                .flatMap(languageId => {
                    const languageItem = languages[languageId];
                    return languageItem.locales.filter(
                        locale => !commonLocales.includes(getLocaleId(locale)) &&
                        (
                            getLocaleNativeName(locale).toLowerCase()
                                    .includes(filterLow) ||
                            getLanguageEnglishName(locale).toLowerCase()
                                    .includes(filterLow)
                        )
                    );
                })
                .map(locale => createMenuItem(locale, "other-"));

        if (otherItems.length > 0) {
            filtered.push(
                <MenuGroup
                  label={_("Other languages")}
                  id={`${idPrefix}-other-languages`}
                  labelHeadingLevel="h3"
                  key="group-other-languages"
                >
                    {otherItems}
                </MenuGroup>
            );
        }

        // Handle case when no results are found
        if (filter && filtered.length === 0) {
            return [
                <MenuItem
                  id={`${idPrefix}-search-no-result`}
                  isDisabled
                  key="no-result"
                >
                    {_("No results found")}
                </MenuItem>
            ];
        }

        return filtered;
    }

    render () {
        const { lang } = this.state;
        const { languages } = this.props;

        const handleOnSelect = (_event, item) => {
            for (const languageItem in languages) {
                for (const localeItem of languages[languageItem].locales) {
                    if (getLocaleId(localeItem) === item) {
                        setLangCookie({ cockpitLang: convertToCockpitLang({ lang: getLocaleId(localeItem) }) });
                        setLanguage({ lang: getLocaleId(localeItem) })
                                .then(() => setLocale({ locale: getLocaleId(localeItem) }))
                                .catch(ex => {
                                    console.info({ ex });
                                    this.props.setStepNotification(ex);
                                });
                        this.setState({ lang: item });
                        this.updateNativeName(localeItem);
                        fetch("po.js").then(response => response.text())
                                .then(body => {
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

                                    this.props.reRenderApp(item);
                                });
                        return;
                    }
                }
            }
        };

        const options = this.renderOptions(this.state.search);

        return (
            <Panel id="installation-language-panel">
                <PanelHeader id="installation-language-panel-header">
                    <TextInputGroup>
                        <TextInputGroupMain
                          icon={<SearchIcon />}
                          value={this.state.search}
                          onChange={(event) => this.setState({ search: event.target.value })}
                          placeholder={_("Find a language")}
                          aria-label={_("Search for a language")}
                        />
                        {this.state.search && (
                            <TextInputGroupUtilities>
                                <Button
                                  variant="plain"
                                  onClick={() => this.setState({ search: "" })}
                                  aria-label={_("Clear search input")}
                                >
                                    <TimesIcon />
                                </Button>
                            </TextInputGroupUtilities>
                        )}
                    </TextInputGroup>
                </PanelHeader>
                <PanelMain>
                    <PanelMainBody id="installation-language-panel-body">
                        <Menu
                          id={this.props.idPrefix + "-language-menu"}
                          isScrollable
                          onSelect={handleOnSelect}
                          aria-invalid={!lang}
                        >
                            <MenuContent maxMenuHeight="60vh">
                                <MenuList>
                                    {options}
                                </MenuList>
                            </MenuContent>
                        </Menu>
                    </PanelMainBody>
                </PanelMain>
            </Panel>
        );
    }
}

const InstallationLanguage = ({ idPrefix, setIsFormValid, setStepNotification }) => {
    const { commonLocales, language, languages } = useContext(LanguageContext);
    const [nativeName, setNativeName] = useState(false);

    useEffect(() => {
        setIsFormValid(language !== "");
    }, [language, setIsFormValid]);

    return (
        <>
            <Title
              headingLevel="h3"
            >
                {_("Choose a language")}
            </Title>
            <Form>
                <FormGroup isRequired>
                    {nativeName && (
                        <Alert
                          id="language-alert"
                          isInline
                          variant="info"
                          title={_("Chosen language: ") + `${nativeName}`}
                        >
                            {_("The chosen language will be used for installation and in the installed software. " +
                               "To use a different language, find it in the language list.")}
                        </Alert>
                    )}
                    <LanguageSelector
                      id="language-selector"
                      idPrefix={idPrefix}
                      languages={languages}
                      commonLocales={commonLocales}
                      language={language}
                      setIsFormValid={setIsFormValid}
                      setStepNotification={setStepNotification}
                      setNativeName={setNativeName}
                      reRenderApp={setLanguage}
                    />
                </FormGroup>
            </Form>
        </>
    );
};

const PageTitle = () => {
    const osRelease = useContext(OsReleaseContext);
    return cockpit.format(_("Welcome to $0"), osRelease.NAME);
};

export class Page {
    constructor (isBootIso) {
        this.component = InstallationLanguage;
        this.id = "installation-language";
        this.isHidden = !isBootIso;
        this.label = _("Welcome");
        this.title = <PageTitle />;
    }
}
