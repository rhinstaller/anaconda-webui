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

/**
 * Check availability of NTP server using chronyd via cockpit.spawn.
 * @param {string} hostname - The NTP server hostname.
 * @param {boolean} nts - Whether to use NTS (Network Time Security).
 * @returns {Promise<"ok" | "nok">} - Result of the check.
 */
export const checkNTPAvailability = async (hostname, nts = false) => {
    const serverDirective = `server ${hostname} iburst maxsamples 1${nts ? " nts" : ""}`;
    const args = ["chronyd", "-Q", serverDirective, "-t", "2"];

    try {
        const output = await cockpit.spawn(args, { superuser: true });
        return output.includes("Leap status") ? "ok" : "nok";
    } catch (error) {
        return "nok";
    }
};

export const getUserLocale = () =>
    navigator.languages?.length
        ? navigator.languages[0]
        : navigator.language || "en-US";
