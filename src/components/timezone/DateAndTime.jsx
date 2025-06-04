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

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
    Button, Checkbox,
    DatePicker, Divider, Flex,
    FlexItem, Form,
    FormGroup, FormGroupLabelHelp, HelperText, HelperTextItem,
    MenuToggle, Modal, ModalBody, ModalFooter, ModalHeader, Popover,
    Select, SelectList,
    SelectOption, Stack,
    StackItem, Switch,
    TextInput, TimePicker,
    Title
} from "@patternfly/react-core";
import { BanIcon, CheckCircleIcon, TrashIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import {
    getAllValidTimezones,
    getNTPEnabled,
    getSystemDateTime,
    getTimeServersFromConfig,
    getTimeSources,
    getTimezone,
    setNTPEnabled,
    setSystemDateTime, setTimeSources,
    setTimezone,
} from "../../apis/timezone.js";

import { convertToCockpitLang } from "../../helpers/language.js";
import {
    checkNTPAvailability,
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

const NTP_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

export const CustomNTPModal = ({ isOpen, onClose, onSave }) => {
    const [hostname, setHostname] = useState("");
    const [error, setError] = useState("");
    const [isPool, setIsPool] = useState(false);
    const [ntpSources, setNtpSources] = useState([]);
    const labelHelpRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const loadSources = async () => {
            const srcs = await getTimeSources();
            const ntps = srcs.filter((s) => s.type?.v === "NTP" || s.type?.v === "POOL");
            const withAvailability = await Promise.all(
                ntps.map(async (s) => ({
                    ...s,
                    available: await checkNTPAvailability(s.hostname.v)
                }))
            );

            if (withAvailability.length) {
                setNtpSources(withAvailability);
            } else {
                const conf = await getTimeServersFromConfig();
                const confList = conf.length ? conf : DEFAULT_NTP_SERVERS.map((h) => ({ hostname: { v: h } }));
                const fallback = await Promise.all(
                    confList.map(async (s) => ({
                        available: await checkNTPAvailability(s.hostname?.v || s),
                        hostname: s.hostname || { v: s },
                        options: { v: ["iburst"] },
                        type: { v: "NTP" }
                    }))
                );
                setNtpSources(fallback);
            }
        };

        loadSources();
    }, [isOpen]);

    const handleAdd = async () => {
        if (!NTP_REGEX.test(hostname)) {
            setError("Invalid NTP server hostname.");
            return;
        }

        const available = await checkNTPAvailability(hostname);

        setNtpSources([
            {
                available,
                hostname: { v: hostname },
                options: { v: ["iburst"] },
                type: { v: isPool ? "POOL" : "NTP" }
            },
            ...ntpSources,
        ]);

        setHostname("");
        setError("");
        setIsPool(false);
    };

    const handleRemove = (idx) => {
        setNtpSources(ntpSources.filter((_, i) => i !== idx));
    };

    const togglePool = (idx) => {
        const updated = [...ntpSources];
        updated[idx] = {
            ...updated[idx],
            type: { v: updated[idx].type.v === "POOL" ? "NTP" : "POOL" }
        };
        setNtpSources(updated);
    };

    const handleConfirm = () => {
        onSave(ntpSources);
        onClose();
    };

    return (
        <Modal
          variant="medium"
          isOpen={isOpen}
          onClose={onClose}
          aria-labelledby="custom-ntp-title"
        >
            <ModalHeader title="Configure custom NTP servers" labelId="custom-ntp-title" />
            <ModalBody>
                <Form id="ntp-form" className="pf-v6-u-mb-md">
                    <FormGroup
                      label="NTP server"
                      labelHelp={
                          <Popover
                            triggerRef={labelHelpRef}
                            headerContent="NTP server format"
                            bodyContent="Enter a valid hostname (e.g., ntp.example.com)"
                          >
                              <FormGroupLabelHelp ref={labelHelpRef} aria-label="Help for NTP server input" />
                          </Popover>
                      }
                      validated={error ? "error" : "default"}
                      fieldId="ntp-input"
                    >
                        <TextInput
                          id="ntp-input"
                          value={hostname}
                          onChange={(_event, val) => {
                              setHostname(val);
                              setError("");
                          }}
                          validated={error ? "error" : "default"}
                          className="pf-v6-u-mb-sm"
                        />
                        {error && (
                            <HelperText>
                                <HelperTextItem variant="error">{error}</HelperTextItem>
                            </HelperText>
                        )}
                    </FormGroup>
                    <Checkbox
                      id="is-pool"
                      label="Is pool"
                      isChecked={isPool}
                      onChange={(_e, val) => setIsPool(val)}
                      className="pf-v6-u-mb-md"
                    />
                    <Button variant="secondary" onClick={handleAdd}>
                        Add server
                    </Button>
                </Form>

                <Divider className="pf-v6-u-my-md" />

                <Table aria-label="NTP Servers" variant="compact" isStriped className="pf-v6-u-mt-md">
                    <Thead>
                        <Tr>
                            <Th>Server</Th>
                            <Th>Options</Th>
                            <Th>Is pool</Th>
                            <Th>Available</Th>
                            <Th />
                        </Tr>
                    </Thead>
                    <Tbody>
                        {ntpSources.map((src, idx) => (
                            <Tr key={idx}>
                                <Td>{src.hostname.v}</Td>
                                <Td>{src.options?.v?.join(" ")}</Td>
                                <Td>
                                    <Checkbox
                                      aria-label="Toggle pool"
                                      isChecked={src.type.v === "POOL"}
                                      onChange={() => togglePool(idx)}
                                    />
                                </Td>
                                <Td>
                                    {src.available === "ok"
                                        ? (
                                            <CheckCircleIcon color="var(--pf-v6-global--success-color--100)" />
                                        )
                                        : (
                                            <BanIcon color="var(--pf-v6-global--danger-color--100)" />
                                        )}
                                </Td>
                                <Td>
                                    <Button
                                      variant="plain"
                                      isInline
                                      icon={<TrashIcon />}
                                      aria-label="Remove server"
                                      onClick={() => handleRemove(idx)}
                                    />
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" onClick={handleConfirm}>
                    Save
                </Button>
                <Button variant="link" onClick={onClose}>
                    Cancel
                </Button>
            </ModalFooter>
        </Modal>
    );
};

const DateAndTimeSection = ({ locale, setSectionValid, timezone }) => {
    const [autoDateTime, setAutoDateTime] = useState(true);
    const [isDateTimeValid, setIsDateTimeValid] = useState(true);
    const [datetime, setDatetime] = useState(DateTime.utc());
    const [showCustomNtpModal, setShowCustomNtpModal] = useState(false);

    const [timeFormat, setTimeFormat] = useState(() =>
        is24HourLocale(locale) ? "24" : "ampm"
    );

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
                                <FlexItem>
                                    <Button
                                      variant="secondary"
                                      onClick={() => setShowCustomNtpModal(true)}
                                      isDisabled={!autoDateTime}
                                    >
                                        {_("Configure NTP servers…")}
                                    </Button>
                                </FlexItem>
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
                            <FlexItem>
                                <Switch
                                  id={`${SCREEN_ID}-show-ampm`}
                                  isChecked={timeFormat === "ampm"}
                                  onChange={() => setTimeFormat(timeFormat === "24" ? "ampm" : "24")}
                                  label={_("Show AM/PM")}
                                />
                            </FlexItem>
                        </Flex>
                    </StackItem>
                </Stack>
            </FormGroup>
            <CustomNTPModal
              isOpen={showCustomNtpModal}
              onClose={() => setShowCustomNtpModal(false)}
              onSave={async (sources) => {
                  await setTimeSources({
                      sources: sources.map(s => ({
                          hostname: cockpit.variant("s", s.hostname.v),
                          options: cockpit.variant("as", s.options.v),
                          type: cockpit.variant("s", s.type.v),
                      }))
                  });

                  setShowCustomNtpModal(false);
              }}
            />
        </>
    );
};

const TimezoneSection = ({ locale, setSectionValid, setTimezoneLabel }) => {
    const [autoTimezone, setAutoTimezone] = useState(true);
    const [regionSelectOpen, setRegionSelectOpen] = useState(false);
    const [citySelectOpen, setCitySelectOpen] = useState(false);
    const [regions, setRegions] = useState([]);
    const [citiesByRegion, setCitiesByRegion] = useState({});
    const [region, setRegion] = useState("");
    const [city, setCity] = useState("");
    const [shownTimezoneLabel, setShownTimezoneLabel] = useState("");

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
            const zone = `${region}/${city}`;
            const dt = DateTime.now().setZone(zone);
            const formatter = new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: zone,
                timeZoneName: "short"
            });

            const parts = formatter.formatToParts(new Date());
            const tzPart = parts.find(p => p.type === "timeZoneName");
            const abbreviation = tzPart?.value;

            const offsetHours = dt.offset / 60;
            const offsetStr = `UTC${offsetHours >= 0 ? "+" : ""}${offsetHours}`;

            const label = (abbreviation && !abbreviation.includes("/"))
                ? `${abbreviation}, ${offsetStr}`
                : offsetStr;

            setTimezoneLabel(zone);
            setShownTimezoneLabel(label);
        }
    }, [region, city, setTimezoneLabel, locale]);

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
                                    {shownTimezoneLabel}
                                </span>
                            </FlexItem>
                        </Flex>
                    </StackItem>
                </Stack>
            </FormGroup>
        </>
    );
};

const DateAndTimePage = ({ setIsFormValid }) => {
    const [dateTimeValid, setDateTimeValid] = useState(false);
    const [timezoneLabel, setTimezoneLabel] = useState("");
    const [timezoneValid, setTimezoneValid] = useState(false);

    const { language } = useContext(LanguageContext);
    const locale = convertToCockpitLang({ lang: language || getUserLocale() });

    useEffect(() => {
        setIsFormValid(dateTimeValid && timezoneValid);
    }, [dateTimeValid, timezoneValid, setIsFormValid]);

    return (
        <Form>
            <DateAndTimeSection locale={locale} setSectionValid={setDateTimeValid} timezone={timezoneLabel} />
            <TimezoneSection locale={locale} setSectionValid={setTimezoneValid} setTimezoneLabel={setTimezoneLabel} />
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
