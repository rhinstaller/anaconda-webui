# Copyright (C) 2022 Red Hat, Inc.
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
from collections import UserDict

import steps
from step_logger import log_step
from storage import StorageEncryption
from users import create_user


class InstallerSteps(UserDict):
    ACCOUNTS = steps.ACCOUNTS
    CUSTOM_MOUNT_POINT = steps.CUSTOM_MOUNT_POINT
    INSTALLATION_METHOD = steps.INSTALLATION_METHOD
    LANGUAGE = steps.LANGUAGE
    PROGRESS = steps.PROGRESS
    REVIEW = steps.REVIEW
    STORAGE_CONFIGURATION = steps.STORAGE_CONFIGURATION

    def __init__(self, hidden_steps=None, scenario=None):
        super().__init__()

        if (scenario == "mount-point-mapping"):
            self.STORAGE_CONFIGURATION = "anaconda-screen-storage-configuration-manual"

        ACCOUNTS = self.ACCOUNTS
        CUSTOM_MOUNT_POINT = self.CUSTOM_MOUNT_POINT
        INSTALLATION_METHOD = self.INSTALLATION_METHOD
        LANGUAGE = self.LANGUAGE
        PROGRESS = self.PROGRESS
        REVIEW = self.REVIEW
        STORAGE_CONFIGURATION = self.STORAGE_CONFIGURATION

        _steps_jump = {}
        _steps_jump[LANGUAGE] = [INSTALLATION_METHOD]
        _steps_jump[STORAGE_CONFIGURATION] = [ACCOUNTS]
        _steps_jump[CUSTOM_MOUNT_POINT] = [ACCOUNTS]
        _steps_jump[ACCOUNTS] = [REVIEW]
        _steps_jump[REVIEW] = [PROGRESS]
        _steps_jump[PROGRESS] = []

        _hidden_steps = hidden_steps or []

        if (scenario == 'use-configured-storage'):
            _steps_jump[INSTALLATION_METHOD] = [ACCOUNTS]
            _hidden_steps.extend([CUSTOM_MOUNT_POINT, STORAGE_CONFIGURATION])
        elif (scenario == 'home-reuse'):
            _steps_jump[INSTALLATION_METHOD] = [ACCOUNTS]
            _hidden_steps.extend([CUSTOM_MOUNT_POINT, STORAGE_CONFIGURATION])
        else:
            _steps_jump[INSTALLATION_METHOD] = [STORAGE_CONFIGURATION, CUSTOM_MOUNT_POINT]

        self._steps_jump = _steps_jump
        self.hidden_steps = _hidden_steps

        _parent_steps = {}
        _parent_steps[CUSTOM_MOUNT_POINT] = STORAGE_CONFIGURATION

        self._parent_steps = _parent_steps

        _steps_callbacks = {}
        _steps_callbacks[ACCOUNTS] = create_user
        _steps_callbacks[STORAGE_CONFIGURATION] = lambda browser, machine: StorageEncryption(browser, machine).set_encryption_selected(False)

        self._steps_callbacks = _steps_callbacks


class Installer():
    def __init__(self, browser, machine, hidden_steps=None, scenario=None):
        self.browser = browser
        self.machine = machine
        self.steps = InstallerSteps(hidden_steps, scenario)


    @log_step(snapshot_before=True)
    def begin_installation(self, should_fail=False, needs_confirmation=True, button_text='Erase data and install'):
        current_page = self.get_current_page()

        if needs_confirmation:
            self.browser.wait_visible("#installation-next-btn[aria-disabled=true]")
            self.browser.click(f"#{self.steps.REVIEW}-next-confirmation-checkbox")
            self.browser.wait_visible("#installation-next-btn[aria-disabled=false]")

        self.browser.wait_text("#installation-next-btn", button_text)
        self.browser.click("#installation-next-btn")

        if should_fail:
            self.wait_current_page(current_page)
        else:
            self.wait_current_page(self.steps._steps_jump[current_page][0])

    def _previous_pages(self, page):
        return [k for k, v in self.steps._steps_jump.items() if page in v]

    def reach(self, target_page):
        path = []
        prev_pages = [target_page]
        current_page = self.get_current_page()

        while current_page not in prev_pages:
            page = prev_pages[0]
            path.append(page)
            prev_pages = self._previous_pages(page)

        while self.get_current_page() != target_page:
            next_page = path.pop()
            if next_page not in self.steps.hidden_steps:
                self.next(next_page=next_page)
                if next_page in self.steps._steps_callbacks:
                    self.steps._steps_callbacks[next_page](self.browser, self.machine)

    @log_step()
    def next(self, should_fail=False, next_page=""):
        current_page = self.get_current_page()
        # If not explicitly specified, get the first item for next page from the steps dict
        if not next_page:
            next_page = self.steps._steps_jump[current_page][0]
            while next_page in self.steps.hidden_steps:
                next_page = self.steps._steps_jump[next_page][0]

        self.browser.click("#installation-next-btn")
        expected_page = current_page if should_fail else next_page
        self.wait_current_page(expected_page)
        return expected_page

    @log_step()
    def check_next_disabled(self, disabled=True):
        """Check if the Next button is disabled.

        :param disabled: True if Next button should be disabled, False if not
        :type disabled: bool, optional
        """
        value = "false" if disabled else "true"
        self.browser.wait_visible(f"#installation-next-btn:not([aria-disabled={value}]")

    def check_sidebar_step_disabled(self, step, disabled=True):
        """Check if a sidebar step is disabled.

        :param disabled: True if the sidebar step should be disabled, False if not
        :type disabled: bool, optional
        """
        value = "true" if disabled else "false"
        self.browser.wait_visible(f"#{step}[aria-disabled={value}]")

    @log_step(snapshot_before=True)
    def back(self, should_fail=False, previous_page=""):
        current_page = self.get_current_page()

        self.browser.click("button:contains(Back)")

        if should_fail:
            self.wait_current_page(current_page)
        else:
            if not previous_page:
                previous_page = self._previous_pages(current_page)[0]
                while previous_page in self.steps.hidden_steps:
                    previous_page = self._previous_pages(previous_page)[0]

            self.wait_current_page(previous_page)

    @log_step()
    def open(self, step=None):
        step = step or self.steps.LANGUAGE
        while step in self.steps.hidden_steps:
            step = self.steps._steps_jump[step][0]
        self.browser.open(f"/cockpit/@localhost/anaconda-webui/index.html#/{step}")
        self.wait_current_page(step)

    def click_step_on_sidebar(self, step=None):
        step = step or self.get_current_page()
        self.browser.click(f"#{step}")

    @log_step()
    def reach_on_sidebar(self, target_page):
        if target_page in self.steps._parent_steps:
            self.click_step_on_sidebar(self.steps._parent_steps[target_page])
        self.click_step_on_sidebar(target_page)
        self.wait_current_page(target_page)

    def get_current_page(self):
        return self.browser.eval_js('window.location.hash;').replace('#/', '') or self.steps[0]

    @log_step(snapshot_after=True)
    def wait_current_page(self, page):
        self.browser.wait_not_present("#disk-encryption-next-spinner")
        self.browser.wait_js_cond(f'window.location.hash === "#/{page}"')

        if page == self.steps.PROGRESS:
            self.browser.wait_visible(".pf-v5-c-progress-stepper")
        else:
            self.browser.wait_visible(f"#{page}.pf-m-current")

    @log_step(snapshot_after=True)
    def check_prerelease_info(self, is_expected=None):
        """ Checks whether the pre-release information is visible or not.

        If is_expected is not set, the expected state is deduced from .buildstamp file.

        :param is_expected: Is it expected that the info is visible or not, defaults to None
        :type is_expected: bool, optional
        """
        if is_expected is not None:
            value = str(is_expected)
        else:
            value = self.machine.execute("grep IsFinal= /.buildstamp").split("=", 1)[1]

        # Check betanag
        if value.lower() == "false":
            self.browser.wait_visible("#betanag-icon")
        else:
            self.browser.wait_not_present("#betang-icon")
