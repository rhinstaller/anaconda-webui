# Copyright (C) 2022 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from step_logger import log_step
from steps import PROGRESS
from testlib import wait


class Progress():
    def __init__(self, browser):
        self.browser = browser
        self._reboot_selector = f".{PROGRESS}-status-success button:contains('Reboot')"

    @log_step(snapshot_after=True)
    def wait_done(self, timeout=1200):
        delay = 30
        wait(
            lambda: self.browser.is_present(self._reboot_selector) or self.browser.is_present("#critical-error-bz-report-modal"),
            delay=delay,
            tries=timeout / delay
        )
        if self.browser.is_present('#critical-error-bz-report-modal'):
            text = self.browser.text('#critical-error-bz-report-modal-details')
            raise AssertionError(
                f"Critical error encountered during installation: {text}"
            )

        self.browser.wait_visible(self._reboot_selector)

    @log_step()
    def reboot(self):
        self.browser.click(self._reboot_selector)
