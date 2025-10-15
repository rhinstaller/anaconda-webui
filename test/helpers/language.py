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
        self.browser.click(f"#{self._step}-change-system-keyboard-layout-modal-open-button")
        self.browser.wait_visible(f"#{self._step}-change-system-keyboard-layout-modal")

        common_prefix = "common" if is_common else "alpha"
        if self.browser.val(self._keyboard_search) != "":
            self.input_keyboard_search("")

        if keyboard_name:
            self.input_keyboard_search(keyboard_name)

        self.browser.click(f"#{self._step}-keyboard-option-{common_prefix}-{keyboard}")
        self.browser.click(f"#{self._step}-change-system-keyboard-layout-modal-save-button")
        self.browser.wait_not_present(f"#{self._step}-change-system-keyboard-layout-modal")

    def input_keyboard_search(self, text):
        self.browser.set_input_text(self._keyboard_search, text)

    def check_selected_keyboard(self, keyboard, is_common=True, present=True):
        if present:
            self.browser.wait_in_text("p", keyboard)
        else:
            self.browser.wait_not_present(f"p:contains('{keyboard}')")

    def check_selected_keyboards_on_device(self, expected_layouts, expected_variants=None):
        result = self.machine.execute("localectl status")
        layout = None
        variant = None

        for line in result.splitlines():
            if "X11 Layout" in line:
                layout = line.split(":")[-1].strip()
            if "X11 Variant" in line:
                variant = line.split(":")[-1].strip()

        # Convert comma-separated string to list
        actual_layouts = [l.strip() for l in layout.split(",")] if layout else []
        actual_variants = [v.strip() for v in variant.split(",")] if variant else []

        # Convert expected_layouts to list if it's a string
        if isinstance(expected_layouts, str):
            expected_layouts = [expected_layouts]
        if expected_variants and isinstance(expected_variants, str):
            expected_variants = [expected_variants]

        assert actual_layouts == expected_layouts, f"Expected layouts {expected_layouts}, but got {actual_layouts}"

        if expected_variants:
            assert actual_variants == expected_variants, f"Expected variants {expected_variants}, but got {actual_variants}"
        else:
            assert not actual_variants, f"Expected no variants, but got {actual_variants}"

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

    def dbus_reset_xlayouts(self):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property \
            {LOCALIZATION_SERVICE} \
            {LOCALIZATION_OBJECT_PATH} \
            {LOCALIZATION_INTERFACE} XLayouts as 0')

    def dbus_reset_virtual_console_keymap(self):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property \
            {LOCALIZATION_SERVICE} \
            {LOCALIZATION_OBJECT_PATH} \
            {LOCALIZATION_INTERFACE} VirtualConsoleKeymap s ""')


class Language(Locale, Keyboard, LanguageDBus):
    def __init__(self, browser, machine):
        Locale.__init__(self, browser, machine)
        Keyboard.__init__(self, browser, machine)
        LanguageDBus.__init__(self, machine)
