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

import React, { useContext, useEffect } from "react";
import {
    Button,
    Form,
    FormGroup,
    Menu,
    MenuContent,
    MenuGroup,
    MenuItem,
    MenuList,
    TextInputGroup,
    TextInputGroupMain,
    TextInputGroupUtilities,
    Title,
} from "@patternfly/react-core";
import { SearchIcon, TimesIcon } from "@patternfly/react-icons";

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
const getLanguageNativeName = lang => lang["native-name"].v;
const getLocaleId = locale => locale["locale-id"].v;
const getLocaleNativeName = locale => locale["native-name"].v;

class LanguageSelector extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            search: "",
        };
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

    renderOptions (filter) {
        const { commonLocales, languages } = this.props;
        const idPrefix = this.props.idPrefix;

        const filtered = [];
        const filterLow = filter.toLowerCase();

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
            console.warn(`Locale with code ${localeCode} not found.`);
        };

        // Helper to create a menu item
        const createMenuItem = (locale, prefix) => {
            const isSelected = this.props.language === getLocaleId(locale);
            // Creating a ref that will be applied to the selected language and cause it to scroll into view.
            const scrollRef = (isSelected)
                ? (ref) => {
                    if (ref) {
                        ref.scrollIntoView({ block: "center" });
                    }
                }
                : undefined;

            return (
                <MenuItem
                  id={`${idPrefix}-${prefix}-${getLocaleId(locale).split(".UTF-8")[0]}`}
                  isSelected={isSelected}
                  key={`${prefix}-${getLocaleId(locale)}`}
                  itemId={getLocaleId(locale)}
                  ref={scrollRef}
                  style={isSelected ? { backgroundColor: "var(--pf-v5-c-menu__list-item--hover--BackgroundColor)" } : undefined}
                >
                    <div id="language-item">
                        <span>{getLocaleNativeName(locale)}</span>
                    </div>
                </MenuItem>
            );
        };

        const onSearch = (locale) => (
            getLocaleNativeName(locale).toLowerCase()
                    .includes(filterLow) ||
            getLanguageNativeName(locale).toLowerCase()
                    .includes(filterLow) ||
            getLanguageEnglishName(locale).toLowerCase()
                    .includes(filterLow)
        );

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
                .filter(locale => locale && onSearch(locale))
                .map(locale => createMenuItem(locale, "option-common"));

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
                .sort((a, b) => {
                    return getLanguageNativeName(languages[a].locales[0]).localeCompare(getLanguageNativeName(languages[b].locales[0]));
                })
                .flatMap(languageId => {
                    const languageItem = languages[languageId];
                    return languageItem.locales.filter(onSearch);
                })
                .filter(locale => commonLocales.indexOf(getLocaleId(locale)) === -1)
                .map(locale => createMenuItem(locale, "option-alpha"));

        if (otherItems.length > 0) {
            filtered.push(
                <MenuGroup
                  label={_("Additional languages")}
                  id={`${idPrefix}-additional-languages`}
                  labelHeadingLevel="h3"
                  key="group-additional-languages"
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
                                    this.props.setStepNotification(ex);
                                });
                        this.setState({ lang: item });
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
            <>
                <TextInputGroup className={this.props.idPrefix + "-search"}>
                    <TextInputGroupMain
                      icon={<SearchIcon />}
                      value={this.state.search}
                      onChange={(event) => this.setState({ search: event.target.value })}
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
                <Menu
                  className={this.props.idPrefix + "-menu"}
                  id={this.props.idPrefix + "-menu"}
                  isScrollable
                  isPlain
                  onSelect={handleOnSelect}
                  aria-invalid={!lang}
                >
                    <MenuContent>
                        <MenuList>
                            {options}
                        </MenuList>
                    </MenuContent>
                </Menu>
            </>
        );
    }
}

const InstallationLanguage = ({ idPrefix, setIsFormValid, setStepNotification }) => {
    const { commonLocales, language, languages } = useContext(LanguageContext);

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
                <FormGroup>
                    <LanguageSelector
                      id="language-selector"
                      idPrefix={idPrefix}
                      languages={languages}
                      commonLocales={commonLocales}
                      language={language}
                      setIsFormValid={setIsFormValid}
                      setStepNotification={setStepNotification}
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
        this.id = "language";
        this.isHidden = !isBootIso;
        this.label = _("Welcome");
        this.title = <PageTitle />;
    }
}
