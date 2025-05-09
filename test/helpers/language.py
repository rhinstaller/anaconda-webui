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


class Locale():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine
        self._step = LANGUAGE
        self._language_search = f".{self._step}-language-search .pf-v6-c-text-input-group__text-input"

    @log_step()
    def select_locale(self, locale, locale_name=None, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        if self.browser.val(self._language_search) != "":
            self.input_locale_search("")

        if locale_name:
            self.input_locale_search(locale_name)

        self.browser.click(f"#{self._step}-language-option-{common_prefix}-{locale}")

    @log_step()
    def get_locale_search(self):
        return self.browser.val(self._language_search)

    @log_step()
    def input_locale_search(self, text):
        self.browser.set_input_text(self._language_search, text)

    @log_step()
    def locale_option_visible(self, locale, visible=True, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        if visible:
            self.browser.wait_visible(f"#{self._step}-language-option-{common_prefix}-{locale}")
        else:
            self.browser.wait_not_present(f"#{self._step}-language-option-{common_prefix}-{locale}")

    @log_step(snapshot_before=True)
    def check_selected_locale(self, locale, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        web_locale = locale.replace("_", "-").lower()
        self.browser.wait_visible(f"#{self._step}-language-option-{common_prefix}-{locale}.pf-m-selected [lang='{web_locale}']")

class Keyboard():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine
        self._step = LANGUAGE
        self._keyboard_search = f".{self._step}-keyboard-search .pf-v6-c-text-input-group__text-input"

    def select_keyboard(self, keyboard, keyboard_name=None, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        if self.browser.val(self._keyboard_search) != "":
            self.input_keyboard_search("")

        if keyboard_name:
            self.input_keyboard_search(keyboard_name)

        self.browser.click(f"#{self._step}-keyboard-option-{common_prefix}-{keyboard}")

    def input_keyboard_search(self, text):
        self.browser.set_input_text(self._keyboard_search, text)

    def check_selected_keyboard(self, keyboard, is_common=True):
        common_prefix = "common" if is_common else "alpha"
        self.browser.wait_visible(f"#{self._step}-keyboard-option-{common_prefix}-{keyboard}.pf-m-selected")

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

class LanguageDBus():
    def __init__(self, machine):
        self.machine = machine
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

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

class Language(Locale, Keyboard, LanguageDBus):
    def __init__(self, browser, machine):
        Locale.__init__(self, browser, machine)
        Keyboard.__init__(self, browser, machine)
        LanguageDBus.__init__(self, machine)
