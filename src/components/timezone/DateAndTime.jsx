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

import React, { useCallback, useContext, useEffect, useState } from "react";
import {
    Checkbox, DatePicker, Flex, FlexItem,
    Form,
    FormGroup,
    MenuToggle,
    Radio,
    Select,
    SelectList,
    SelectOption,
    Stack,
    StackItem,
    TimePicker,
    Title
} from "@patternfly/react-core";

import {
    getAllValidTimezones, getNTPEnabled, getSystemDateTime, getTimeSources, getTimezone, setNTPEnabled,
    setSystemDateTime, setTimeSources, setTimezone,
} from "../../apis/timezone.js";

import { convertToCockpitLang } from "../../helpers/language.js";
import {
    formatTimeForDisplay,
    fromAmPm,
    getUserLocale,
    is24HourLocale,
} from "../../helpers/timezone.js";

import { LanguageContext } from "../../contexts/Common.jsx";

import "./DateAndTime.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-date-time";

const DEFAULT_NTP_SERVERS = [
    "ntp.fedoraproject.org", "pool.ntp.org", "time.cloudflare.com"
];

const DateAndTimeSection = ({ locale, setSectionValid, timeFormat }) => {
    const [autoDateTime, setAutoDateTime] = useState(true);
    const [ntpSelectOpen, setNtpSelectOpen] = useState(false);
    const [ntpServer, setNtpServer] = useState("");
    const [ntpServers, setNtpServers] = useState([]);
    const [date, setDate] = useState("");
    const [time24, setTime24] = useState("");

    useEffect(() => {
        setSectionValid(
            autoDateTime ||
            (!!date && !!time24)
        );
    }, [autoDateTime, date, time24, setSectionValid]);

    useEffect(() => {
        const updateTimeDateData = async () => {
            try {
                const ntpEnabled = await getNTPEnabled();
                setAutoDateTime(!!ntpEnabled);

                const dt = await getSystemDateTime();
                if (dt) {
                    const [d, t] = dt.split("T");
                    setDate(d);
                    setTime24(t?.substring(0, 5) || "");
                }

                const srcs = await getTimeSources();
                const ntps = srcs
                        .filter(s => s.type?.v === "NTP")
                        .map(s => s.name?.v)
                        .filter(Boolean);

                setNtpServers(ntps.length
                    ? ntps
                    : DEFAULT_NTP_SERVERS
                );
                setNtpServer(ntps[0] || "ntp.fedoraproject.org");
            } catch (err) {
                // Optionally handle errors here
                console.error("Failed to fetch time/date/time source data:", err);
            }
        };

        updateTimeDateData();
    }, []);

    const handleAutoDateTime = useCallback(() => {
        const newValue = !autoDateTime;
        setAutoDateTime(newValue);
        setNTPEnabled({ enabled: newValue });
    }, [autoDateTime]);

    // Change handler for time
    const handleTimeChange = (event, value) => {
        let value24 = value;
        if (timeFormat === "ampm") {
            value24 = fromAmPm(value);
        }
        setTime24(value24);
        if (!autoDateTime && date && value24) {
            setSystemDateTime({ dateTimeSpec: `${date}T${value24}` });
        }
    };

    const displayedTime =
        timeFormat === "ampm"
            ? formatTimeForDisplay(time24, locale, true)
            : formatTimeForDisplay(time24, locale, false);

    const handleDateChange = (event, value) => {
        setDate(value);
        if (!autoDateTime && value && time24) {
            setSystemDateTime({ dateTimeSpec: `${value}T${time24}` });
        }
    };

    const handleNtpServerSelect = (event, value) => {
        setNtpServer(value);
        setNtpSelectOpen(false);
        setTimeSources({ sources: [{ enabled: true, name: value, type: "NTP" }] });
    };

    const ntpToggle = toggleRef => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setNtpSelectOpen(!ntpSelectOpen)}
          isExpanded={ntpSelectOpen}
          isDisabled={!autoDateTime}
        >
            {ntpServer}
        </MenuToggle>
    );

    return (
        <>
            <Title headingLevel="h2">{_("Date and time")}</Title>
            <FormGroup>
                <Stack hasGutter>
                    <StackItem>
                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                            <FlexItem>
                                <Checkbox
                                  id={`${SCREEN_ID}-auto-date-time`}
                                  isChecked={autoDateTime}
                                  onChange={handleAutoDateTime}
                                  label={_("Automatically set date and time, using time server:")}
                                  aria-label={_("Automatically set date and time")}
                                />
                            </FlexItem>
                            <FlexItem>
                                <Select
                                  id={`${SCREEN_ID}-ntp-server`}
                                  isOpen={ntpSelectOpen}
                                  selected={ntpServer}
                                  onSelect={handleNtpServerSelect}
                                  onOpenChange={setNtpSelectOpen}
                                  toggle={ntpToggle}
                                  shouldFocusToggleOnSelect
                                  aria-label={_("Select NTP server")}
                                >
                                    <SelectList>
                                        {ntpServers.map(server =>
                                            <SelectOption key={server} value={server}>{server}</SelectOption>
                                        )}
                                    </SelectList>
                                </Select>
                            </FlexItem>
                        </Flex>
                    </StackItem>
                    <StackItem>
                        <Flex alignItems={{ default: "alignItemsCenter" }} className={`${SCREEN_ID}__indent`}>
                            <FlexItem>
                                <DatePicker
                                  id={`${SCREEN_ID}-date`}
                                  value={date}
                                  onChange={handleDateChange}
                                  isDisabled={autoDateTime}
                                  aria-label={_("Date")}
                                />
                            </FlexItem>
                            <FlexItem>
                                <TimePicker
                                  id={`${SCREEN_ID}-time`}
                                  time={displayedTime}
                                  onChange={handleTimeChange}
                                  is24Hour={timeFormat === "24"}
                                  isDisabled={autoDateTime}
                                  aria-label={_("Time")}
                                  placeholder={timeFormat === "24" ? "HH:MM" : "hh:mm AM/PM"}
                                />
                            </FlexItem>
                        </Flex>
                    </StackItem>
                </Stack>
            </FormGroup>
        </>
    );
};

const TimezoneSection = ({ setSectionValid }) => {
    const [autoTimezone, setAutoTimezone] = useState(true);
    const [regionSelectOpen, setRegionSelectOpen] = useState(false);
    const [citySelectOpen, setCitySelectOpen] = useState(false);
    const [regions, setRegions] = useState([]);
    const [citiesByRegion, setCitiesByRegion] = useState({});
    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");
    const [timezoneLabel, setTimezoneLabel] = useState("");

    useEffect(() => {
        getAllValidTimezones().then(zoneDict => {
            const keys = Object.keys(zoneDict || {});
            setRegions(keys);
            setCitiesByRegion(zoneDict || {});
            if (keys.length) {
                setRegion(keys[0]);
                setCity(zoneDict[keys[0]][0]);
            }
        });
        getTimezone().then(val => {
            if (val && typeof val === "string" && val.includes("/")) {
                const [reg, cty] = val.split("/");
                setRegion(reg);
                setCity(cty);
            }
        });
    }, []);

    useEffect(() => {
        setSectionValid(autoTimezone || (!!region && !!city));
    }, [autoTimezone, region, city, setSectionValid]);

    useEffect(() => {
        if (region && city) {
            setTimezoneLabel(`${region}/${city}`);
        }
    }, [region, city]);

    const handleRegionSelect = (_ev, value) => {
        setRegion(value);
        setCity(citiesByRegion[value][0]);
        setRegionSelectOpen(false);
        setTimezone({ timezone: `${value}/${citiesByRegion[value][0]}` });
    };
    const handleCitySelect = (_ev, value) => {
        setCity(value);
        setCitySelectOpen(false);
        setTimezone({ timezone: `${region}/${value}` });
    };

    const regionToggle = toggleRef => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setRegionSelectOpen(!regionSelectOpen)}
          isExpanded={regionSelectOpen}
          isDisabled={autoTimezone}
          className={`${SCREEN_ID}__region-toggle`}
        >
            {region}
        </MenuToggle>
    );
    const cityToggle = toggleRef => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setCitySelectOpen(!citySelectOpen)}
          isExpanded={citySelectOpen}
          isDisabled={autoTimezone}
          className={`${SCREEN_ID}__city-toggle`}
        >
            {city}
        </MenuToggle>
    );

    return (
        <>
            <Title headingLevel="h2">{_("Timezone")}</Title>
            <FormGroup>
                <Stack hasGutter>
                    <StackItem>
                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                            <FlexItem>
                                <Checkbox
                                  id={`${SCREEN_ID}-auto-timezone`}
                                  isChecked={autoTimezone}
                                  onChange={() => setAutoTimezone(!autoTimezone)}
                                  label={_("Automatically set timezone")}
                                  aria-label={_("Automatically set timezone")}
                                />
                            </FlexItem>
                        </Flex>
                    </StackItem>
                    <StackItem>
                        <Flex alignItems={{ default: "alignItemsCenter" }} className={`${SCREEN_ID}__indent`}>
                            <FlexItem>
                                <Select
                                  id={`${SCREEN_ID}-region`}
                                  isOpen={regionSelectOpen}
                                  selected={region}
                                  onSelect={handleRegionSelect}
                                  onOpenChange={setRegionSelectOpen}
                                  toggle={regionToggle}
                                  shouldFocusToggleOnSelect
                                  isDisabled={autoTimezone}
                                  aria-label={_("Select region")}
                                  className={`${SCREEN_ID}__select--region`}
                                >
                                    <SelectList className={`${SCREEN_ID}__select-list--scrollable`}>
                                        {regions.map(r =>
                                            <SelectOption key={r} value={r}>{r}</SelectOption>
                                        )}
                                    </SelectList>
                                </Select>
                            </FlexItem>
                            <FlexItem>
                                <Select
                                  id={`${SCREEN_ID}-city`}
                                  isOpen={citySelectOpen}
                                  selected={city}
                                  onSelect={handleCitySelect}
                                  onOpenChange={setCitySelectOpen}
                                  toggle={cityToggle}
                                  shouldFocusToggleOnSelect
                                  isDisabled={autoTimezone}
                                  aria-label={_("Select city")}
                                  className={`${SCREEN_ID}__select--city`}
                                >
                                    <SelectList className={`${SCREEN_ID}__select-list--scrollable`}>
                                        {(citiesByRegion[region] || [])
                                                .slice()
                                                .sort((a, b) => a.localeCompare(b))
                                                .map(c =>
                                                    <SelectOption key={c} value={c}>{c}</SelectOption>
                                                )}
                                    </SelectList>
                                </Select>
                            </FlexItem>
                            <FlexItem>
                                <span className={`${SCREEN_ID}__timezone-label`}>
                                    {timezoneLabel}
                                </span>
                            </FlexItem>
                        </Flex>
                    </StackItem>
                </Stack>
            </FormGroup>
        </>
    );
};

const TimeFormatSection = ({ setTimeFormat, timeFormat }) => (
    <>
        <Title headingLevel="h2">{_("Time format")}</Title>
        <FormGroup>
            <Flex alignItems={{ default: "alignItemsCenter" }}>
                <FlexItem>
                    <Radio
                      id={`${SCREEN_ID}-time-format-24`}
                      name="timeFormat"
                      label={_("24 hour")}
                      isChecked={timeFormat === "24"}
                      onChange={() => setTimeFormat("24")}
                    />
                </FlexItem>
                <FlexItem>
                    <Radio
                      id={`${SCREEN_ID}-time-format-ampm`}
                      name="timeFormat"
                      label={_("AM / PM")}
                      isChecked={timeFormat === "ampm"}
                      onChange={() => setTimeFormat("ampm")}
                    />
                </FlexItem>
            </Flex>
        </FormGroup>
    </>
);

const DateAndTimePage = ({ setIsFormValid }) => {
    const [dateTimeValid, setDateTimeValid] = useState(false);
    const [timezoneValid, setTimezoneValid] = useState(false);

    const { language } = useContext(LanguageContext);
    const locale = convertToCockpitLang({ lang: language || getUserLocale() });

    const [timeFormat, setTimeFormat] = useState(() =>
        is24HourLocale(locale) ? "24" : "ampm"
    );

    useEffect(() => {
        setIsFormValid(dateTimeValid && timezoneValid);
    }, [dateTimeValid, timezoneValid, setIsFormValid]);

    return (
        <Form>
            <DateAndTimeSection locale={locale} setSectionValid={setDateTimeValid} timeFormat={timeFormat} />
            <TimezoneSection setSectionValid={setTimezoneValid} />
            <TimeFormatSection setTimeFormat={setTimeFormat} timeFormat={timeFormat} />
        </Form>
    );
};

export class Page {
    constructor () {
        this.component = DateAndTimePage;
        this.id = SCREEN_ID;
        this.label = _("Date and time");
    }
}
