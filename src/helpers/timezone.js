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
export const is24HourLocale = locale => {
    try {
        const format = new Intl.DateTimeFormat(locale, { hour: "numeric" });
        const opts = format.resolvedOptions();
        return opts.hourCycle === "h23" || opts.hourCycle === "h24" || opts.hour12 === false;
    } catch {
        return true; // fallback to 24-hour format
    }
};

export const formatTimeForDisplay = (time24, locale, forceAmPm = false) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const dt = new Date(2000, 0, 1, h, m);

    const opts = { hour: "2-digit", minute: "2-digit" };
    opts.hour12 = forceAmPm;
    return new Intl.DateTimeFormat(locale, opts).format(dt);
};

export const fromAmPm = (time12) => {
    if (!time12) return "";
    const m = time12.match(/(\d{1,2}):(\d{2})\s*([APMapm]{2,})/);
    if (!m) return "";
    let [_, h, min, ap] = m;
    h = Number(h);
    min = Number(min);
    ap = ap.toUpperCase();
    if (ap.startsWith("P") && h < 12) h += 12;
    if (ap.startsWith("A") && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
};

export const getUserLocale = () =>
    navigator.languages && navigator.languages.length
        ? navigator.languages[0]
        : navigator.language || "en-US";
