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
