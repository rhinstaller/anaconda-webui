# Copyright (C) 2021 Red Hat, Inc.
#
# This program is free software; you can redistribute it and/or modify it
# under the terms of the GNU Lesser General Public License as published by
# the Free Software Foundation; either version 2.1 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with this program; If not, see <http://www.gnu.org/licenses/>.

DATE_TIME_STEP = "anaconda-screen-date-time"

class DateTime():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine
        self._step = DATE_TIME_STEP

    def set_auto_date_time(self, value):
        self.browser.set_checked(f"#{self._step}-auto-date-time", value)
        checked = self.browser.get_checked(f"#{self._step}-auto-date-time")
        assert checked == value, f"Expected checked={value}, got {checked}"

    def check_auto_date_time(self, value):
        checked = self.browser.get_checked(f"#{self._step}-auto-date-time")
        assert checked == value, f"Expected checked={value}, got {checked}"

    def set_date(self, value):
        self.browser.set_input_text(f"#{self._step}-date input", value)

    def check_date(self, value):
        self.browser.wait_val(f"#{self._step}-date input", value)

    def set_time(self, value):
        self.browser.set_input_text(f"#{self._step}-time input", value)

    def check_time(self, value):
        self.browser.wait_val(f"#{self._step}-time input", value)

    def check_ntp_server_enabled(self, hostname, index):
        b = self.browser
        b.click(f"#{self._step}-configure-ntp")
        b.wait_visible(f"#{self._step}-ntp-modal")
        b.wait_val(f"#{self._step}-ntp-table-row-{index}-hostname", hostname)

    def add_ntp_server(self, server, index):
        b = self.browser
        b.set_checked(f"#{self._step}-auto-date-time", True)
        b.click(f"#{self._step}-configure-ntp")
        b.wait_visible(f"#{self._step}-ntp-modal")
        b.click(f"#{self._step}-ntp-table-add-server-button")
        b.set_input_text(f"#{self._step}-ntp-table-row-{index}-hostname", server)
        b.click(f"#{self._step}-ntp-modal-save-button")
        b.wait_not_present(f"#{self._step}-ntp-modal")

class Timezone():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine
        self._step = DATE_TIME_STEP

    def set_auto_timezone(self, value):
        self.browser.set_checked(f"#{self._step}-auto-timezone", value)
        checked = self.browser.get_checked(f"#{self._step}-auto-timezone")
        assert checked == value, f"Expected checked={value}, got {checked}"

    def check_auto_timezone(self, value):
        checked = self.browser.get_checked(f"#{self._step}-auto-timezone")
        assert checked == value, f"Expected checked={value}, got {checked}"

    def select_region(self, region):
        self.browser.click("#anaconda-screen-date-time-region-toggle")
        self.browser.wait_visible("#anaconda-screen-date-time-region")
        self.browser.click(f"#anaconda-screen-date-time-region .pf-v6-c-menu__item-text:contains('{region}')")
        self.browser.wait_not_present("#anaconda-screen-date-time-region")

    def check_region(self, region):
        self.browser.wait_in_text(f".{self._step}__region-toggle", region)

    def select_city(self, city):
        self.browser.click("#anaconda-screen-date-time-city-toggle")
        self.browser.wait_visible("#anaconda-screen-date-time-city")
        self.browser.click(f"#anaconda-screen-date-time-city .pf-v6-c-menu__item-text:contains('{city}')")
        self.browser.wait_not_present("#anaconda-screen-date-time-city")

    def check_city(self, city):
        self.browser.wait_in_text(f".{self._step}__city-toggle", city)

    def check_timezone_label(self, value):
        self.browser.wait_in_text(f".{self._step}__timezone-label", value)


class TimeFormat():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine
        self._step = DATE_TIME_STEP

    def set_time_format(self, fmt):
        # fmt: "24" or "ampm"
        self.browser.set_checked(f"#{self._step}-show-ampm", fmt == "ampm")

    def check_time_format(self, fmt):
        checked = self.browser.get_checked(f"#{self._step}-show-ampm")
        if fmt == "24":
            assert not checked
        else:
            assert checked

class DateTimeDBus():
    TIMEZONE_SERVICE = "org.fedoraproject.Anaconda.Modules.Timezone"
    TIMEZONE_INTERFACE = "org.fedoraproject.Anaconda.Modules.Timezone"
    TIMEZONE_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Timezone"

    def __init__(self, machine):
        self.machine = machine
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

    def dbus_get_system_datetime(self):
        out = self.machine.execute(f'busctl --address="{self._bus_address}" \
            call {self.TIMEZONE_SERVICE} {self.TIMEZONE_OBJECT_PATH} \
            {self.TIMEZONE_INTERFACE} GetSystemDateTime')
        return out.split('"')[1]

    def dbus_get_ntp_enabled(self):
        return "true" in self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property {self.TIMEZONE_SERVICE} {self.TIMEZONE_OBJECT_PATH} \
            {self.TIMEZONE_INTERFACE} NTPEnabled')

    def dbus_set_ntp_enabled(self, value):
        val_str = "true" if value else "false"
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property {self.TIMEZONE_SERVICE} {self.TIMEZONE_OBJECT_PATH} \
            {self.TIMEZONE_INTERFACE} NTPEnabled b {val_str}')

    def dbus_get_timezone(self):
        out = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property {self.TIMEZONE_SERVICE} {self.TIMEZONE_OBJECT_PATH} \
            {self.TIMEZONE_INTERFACE} Timezone')
        return out.split('"')[1]

    def dbus_clear_time_sources(self):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property {self.TIMEZONE_SERVICE} {self.TIMEZONE_OBJECT_PATH} \
            {self.TIMEZONE_INTERFACE} TimeSources "aa{{sv}}" {0}')

class DateAndTime(DateTime, Timezone, TimeFormat, DateTimeDBus):
    def __init__(self, browser, machine):
        DateTime.__init__(self, browser, machine)
        Timezone.__init__(self, browser, machine)
        TimeFormat.__init__(self, browser, machine)
        DateTimeDBus.__init__(self, machine)
