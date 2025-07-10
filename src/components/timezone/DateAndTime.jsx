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

import { DateTime } from "luxon";

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
    getAllValidTimezones,
    getNTPEnabled,
    getSystemDateTime,
    getTimeServersFromConfig,
    getTimeSources,
    getTimezone,
    setNTPEnabled,
    setSystemDateTime,
    setTimeSources,
    setTimezone,
} from "../../apis/timezone.js";

import { convertToCockpitLang } from "../../helpers/language.js";
import {
    formatDateInput, getLocalTimeForPicker, getUserLocale,
    is24HourLocale,
    isValidDate,
} from "../../helpers/timezone.js";

import { LanguageContext } from "../../contexts/Common.jsx";

import "./DateAndTime.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-date-time";

const DEFAULT_NTP_SERVERS = [
    "ntp.fedoraproject.org", "pool.ntp.org", "time.cloudflare.com"
];

const DateAndTimeSection = ({ setSectionValid, timeFormat, timezone }) => {
    const [autoDateTime, setAutoDateTime] = useState(true);
    const [ntpSelectOpen, setNtpSelectOpen] = useState(false);
    const [ntpServer, setNtpServer] = useState("");
    const [ntpServers, setNtpServers] = useState([]);
    const [isDateTimeValid, setIsDateTimeValid] = useState(true);
    const [datetime, setDatetime] = useState(DateTime.utc());

    // Initial data fetch
    useEffect(() => {
        const updateTimeDateData = async () => {
            const ntpEnabled = await getNTPEnabled();
            setAutoDateTime(!!ntpEnabled);

            const dtIso = await getSystemDateTime();
            if (dtIso) {
                setDatetime(
                    DateTime.fromISO(dtIso, { zone: "utc" }).setZone(timezone)
                );
            }

            // DBus time sources (user-configured)
            const srcs = await getTimeSources();
            const ntps = srcs
                    .filter(s => s.type?.v === "NTP")
                    .map(s => s.name?.v)
                    .filter(Boolean);

            // Fallback: read from system config (chrony)
            const srcConf = await getTimeServersFromConfig();
            const confNtpServers = srcConf
                    .map(s => s.hostname?.v)
                    .filter(Boolean);

            const finalServers = ntps.length
                ? ntps
                : (confNtpServers.length ? confNtpServers : DEFAULT_NTP_SERVERS);

            setNtpServers(finalServers);
            setNtpServer(finalServers[0] || "ntp.fedoraproject.org");
        };

        updateTimeDateData();
    }, [timezone]);

    const handleAutoDateTime = useCallback(() => {
        const newValue = !autoDateTime;
        setAutoDateTime(newValue);
        setNTPEnabled({ enabled: newValue });
    }, [autoDateTime]);

    // Section validity update
    useEffect(() => {
        setSectionValid(autoDateTime || isDateTimeValid);
    }, [autoDateTime, isDateTimeValid, setSectionValid]);

    const handleDateChange = (_event, _, newDate) => {
        const isValid = !!newDate && isValidDate(newDate);
        setIsDateTimeValid(isValid);

        if (!isValid) return;

        const localDate = DateTime.fromJSDate(newDate);
        const datePart = localDate.setZone(timezone, { keepLocalTime: true });

        const combined = datetime.set({
            day: datePart.day,
            month: datePart.month,
            year: datePart.year,
        });

        setDatetime(combined);

        if (!autoDateTime && combined.isValid) {
            setSystemDateTime({ dateTimeSpec: combined.toISO() });
        }
    };

    // TimePicker change handler
    const handleTimeChange = (event, _, hour, minute, seconds, isValid) => {
        const timeIsEmpty = hour === null || minute === null;
        const valid = isValid && !timeIsEmpty;

        setIsDateTimeValid(valid);

        if (!valid) return;
        if (typeof hour !== "number" || typeof minute !== "number") return;
        const updated = datetime.set({
            hour,
            minute,
            second: seconds || 0,
        });
        setDatetime(updated);
        if (!autoDateTime && updated.isValid) {
            setSystemDateTime({ dateTimeSpec: updated.toISO() });
        }
    };

    const handleNtpServerSelect = (event, value) => {
        setNtpServer(value);
        setNtpSelectOpen(false);
        setTimeSources({ sources: [{ enabled: true, name: value, type: "NTP" }] });
    };

    const ntpToggle = toggleRef => (
        <MenuToggle
          id={`${SCREEN_ID}-ntp-toggle`}
          ref={toggleRef}
          onClick={() => setNtpSelectOpen(!ntpSelectOpen)}
          isExpanded={ntpSelectOpen}
          isDisabled={!autoDateTime}
        >
            {ntpServer}
        </MenuToggle>
    );

    // Always derive these on render
    const datePickerValue = formatDateInput(datetime);
    const timePickerValue = getLocalTimeForPicker(datetime, timeFormat === "24");

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
                                  value={datePickerValue}
                                  onChange={handleDateChange}
                                  isDisabled={autoDateTime}
                                  aria-label={_("Date")}
                                />
                            </FlexItem>
                            <FlexItem>
                                <TimePicker
                                  id={`${SCREEN_ID}-time`}
                                  key={timeFormat + timezone}
                                  time={timePickerValue}
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

const TimezoneSection = ({ setSectionValid, setTimezoneLabel, timezoneLabel }) => {
    const [autoTimezone, setAutoTimezone] = useState(true);
    const [regionSelectOpen, setRegionSelectOpen] = useState(false);
    const [citySelectOpen, setCitySelectOpen] = useState(false);
    const [regions, setRegions] = useState([]);
    const [citiesByRegion, setCitiesByRegion] = useState({});
    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");

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
    }, [region, city, setTimezoneLabel]);

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
          id={`${SCREEN_ID}-region-toggle`}
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
          id={`${SCREEN_ID}-city-toggle`}
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
                                  aria-label={_("Select city")}
                                  className={`${SCREEN_ID}__select--city`}
                                >
                                    <SelectList className={`${SCREEN_ID}__select-list--scrollable`}>
                                        {(citiesByRegion[region] || [])
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
    const [timezoneLabel, setTimezoneLabel] = useState("");
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
            <DateAndTimeSection locale={locale} setSectionValid={setDateTimeValid} timeFormat={timeFormat} timezone={timezoneLabel} />
            <TimezoneSection setSectionValid={setTimezoneValid} setTimezoneLabel={setTimezoneLabel} timezoneLabel={timezoneLabel} />
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
