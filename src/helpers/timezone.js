/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

/** Detects if the locale uses 24h clock. */
export const is24HourLocale = (locale) => {
    try {
        const format = new Intl.DateTimeFormat(locale, { hour: "numeric" });
        const opts = format.resolvedOptions();
        return opts.hourCycle === "h23" || opts.hourCycle === "h24" || opts.hour12 === false;
    } catch {
        return true;
    }
};

/**
 * Returns local time as string ("HH:mm" or "hh:mm a") for displaying in picker.
 * @param {DateTime} dateTime - Luxon DateTime (from backend/state)
 * @param {boolean} is24Hour - Should display as 24h (true) or 12h (false)
 * @returns {string}
 */
export const getLocalTimeForPicker = (dateTime, is24Hour = true) => {
    if (!dateTime || !dateTime.isValid) return "";
    return dateTime.toFormat(is24Hour ? "HH:mm" : "hh:mm a");
};

/** Returns true if argument is a valid JS Date */
export const isValidDate = (val) =>
    val instanceof Date && !isNaN(val.getTime());

/** Formats a Luxon DateTime as 'YYYY-MM-DD' (for DatePicker input). */
export const formatDateInput = (dt) => {
    if (typeof dt?.toISO !== "function" || !dt?.isValid) return "";
    return dt.toISODate();
};

export const getUserLocale = () =>
    navigator.languages?.length
        ? navigator.languages[0]
        : navigator.language || "en-US";
