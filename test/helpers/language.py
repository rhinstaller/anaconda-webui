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

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from step_logger import log_step
from steps import LANGUAGE

LOCALIZATION_SERVICE = "org.fedoraproject.Anaconda.Modules.Localization"
LOCALIZATION_INTERFACE = "org.fedoraproject.Anaconda.Modules.Localization"
LOCALIZATION_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Localization"

BOSS_SERVICE = "org.fedoraproject.Anaconda.Boss"
BOSS_INTERFACE = BOSS_SERVICE
BOSS_OBJECT_PATH = "/org/fedoraproject/Anaconda/Boss"


class Language():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine
        self._step = LANGUAGE
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

    @log_step()
    def select_locale(self, locale, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        if self.browser.val(f".{self._step}-search .pf-v5-c-text-input-group__text-input") != "":
            self.input_locale_search("")
        self.browser.click(f"#{self._step}-option-{common_prefix}-{locale}")

    @log_step()
    def get_locale_search(self):
        return self.browser.val(f".{self._step}-search .pf-v5-c-text-input-group__text-input")

    @log_step()
    def input_locale_search(self, text):
        self.browser.set_input_text(f".{self._step}-search .pf-v5-c-text-input-group__text-input", text)

    @log_step()
    def locale_option_visible(self, locale, visible=True, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        if visible:
            self.browser.wait_visible(f"#{self._step}-option-{common_prefix}-{locale}")
        else:
            self.browser.wait_not_present(f"#{self._step}-option-{common_prefix}-{locale}")

    @log_step(snapshot_before=True)
    def check_selected_locale(self, locale, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        self.browser.wait_visible(f"#{self._step}-option-{common_prefix}-{locale}.pf-m-selected")

    def dbus_set_language(self, value):
        self.machine.execute(f'dbus-send --print-reply --bus="{self._bus_address}" \
            --dest={LOCALIZATION_INTERFACE} \
            {LOCALIZATION_OBJECT_PATH} \
            org.freedesktop.DBus.Properties.Set \
            string:"{LOCALIZATION_INTERFACE}" string:"Language" variant:string:"{value}"')

    def dbus_get_language(self):
        return self.machine.execute(f'dbus-send --print-reply --bus="{self._bus_address}" \
            --dest={LOCALIZATION_INTERFACE} \
            {LOCALIZATION_OBJECT_PATH} \
            org.freedesktop.DBus.Properties.Get \
            string:"{LOCALIZATION_INTERFACE}" string:"Language"')

    def dbus_set_locale(self, value):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            call \
            {BOSS_SERVICE} \
            {BOSS_OBJECT_PATH} \
            {BOSS_INTERFACE} SetLocale s "{value}"')

    def dbus_set_compositor_layouts(self, layouts):
        self.machine.execute(f"busctl --address='{self._bus_address}' \
            call \
            {LOCALIZATION_SERVICE} \
            {LOCALIZATION_OBJECT_PATH} \
            {LOCALIZATION_INTERFACE} SetCompositorLayouts asas 1 '{layouts[0]}' 0")

    def select_keyboard_layout(self, layout):
        self.browser.select_from_dropdown(".anaconda-screen-selectors-container select", layout)

    def check_selected_keyboard(self, layout):
        self.browser.wait_val(".anaconda-screen-selectors-container select", layout)

    def check_selected_keyboard_on_device(self, expected_layout, expected_variant=None):
        result = self.machine.execute("localectl status")
        layout = None
        variant = None

        for line in result.splitlines():
            if "X11 Layout" in line:
                layout = line.split(":")[-1].strip()
            if "X11 Variant" in line:
                variant = line.split(":")[-1].strip()

        assert layout == expected_layout, f"Expected layout '{expected_layout}', but got '{layout}'"

        if expected_variant:
            assert variant == expected_variant, f"Expected variant '{expected_variant}', but got '{variant}'"
        else:
            assert not variant, f"Expected no variant, but got '{variant}'"
