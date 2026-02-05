/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { DateTime } from "luxon";

import React, { useCallback, useContext, useEffect, useState } from "react";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { DatePicker } from "@patternfly/react-core/dist/esm/components/DatePicker/index.js";
import { Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Popover } from "@patternfly/react-core/dist/esm/components/Popover/index.js";
import { Switch } from "@patternfly/react-core/dist/esm/components/Switch/index.js";
import { TimePicker } from "@patternfly/react-core/dist/esm/components/TimePicker/index.js";
import { Title } from "@patternfly/react-core/dist/esm/components/Title/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Stack, StackItem } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";

import {
    getNTPEnabled,
    getSystemDateTime,
    setNTPEnabled,
    setSystemDateTime,
} from "../../apis/timezone.js";

import { convertToCockpitLang } from "../../helpers/language.js";
import {
    formatDateInput, getLocalTimeForPicker, getUserLocale,
    is24HourLocale,
    isValidDate,
} from "../../helpers/timezone.js";

import { LanguageContext, NetworkContext } from "../../contexts/Common.jsx";

import { CustomNTP } from "./CustomNTPModal.jsx";
import { TimezoneSection } from "./Timezone.jsx";

import "./DateAndTime.scss";

const _ = cockpit.gettext;
const SCREEN_ID = "anaconda-screen-date-time";

const DateAndTimeSection = ({ locale, setSectionValid, timezone }) => {
    const [autoDateTime, setAutoDateTime] = useState(true);
    const [isDateTimeValid, setIsDateTimeValid] = useState(true);
    const [datetime, setDatetime] = useState(DateTime.utc());
    const isConnected = useContext(NetworkContext).connected;

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

    const autoDateTimeCheckbox = (
        <Checkbox
          disabled={!isConnected}
          id={`${SCREEN_ID}-auto-date-time`}
          isChecked={autoDateTime}
          label={_("Automatically set date and time, using time servers")}
          onChange={handleAutoDateTime}
        />
    );
    const autoDateTimeItem = isConnected
        ? autoDateTimeCheckbox
        : (
            <Popover
              id={`${SCREEN_ID}-auto-date-time-popover`}
              bodyContent={_("You must be connected to a network to enable automatic date and time.")}
              triggerAction="hover"
            >
                {autoDateTimeCheckbox}
            </Popover>
        );

    return (
        <>
            <Title headingLevel="h2">{_("Date and time")}</Title>
            <FormGroup>
                <Stack hasGutter>
                    <StackItem>
                        <Flex alignItems={{ default: "alignItemsCenter" }}>
                            <FlexItem>
                                {autoDateTimeItem}
                            </FlexItem>
                            <FlexItem>
                                <CustomNTP autoDateTime={autoDateTime} />
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
        </>
    );
};

export const DateAndTimePage = ({ setIsFormValid }) => {
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
