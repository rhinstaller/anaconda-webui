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

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from installer import InstallerSteps  # pylint: disable=import-error
from network import NetworkDBus
from step_logger import log_step


class Review(NetworkDBus):
    def __init__(self, browser, machine):
        self.browser = browser
        self._step = InstallerSteps.REVIEW

        NetworkDBus.__init__(self, machine)

    @log_step()
    def check_hostname(self, hostname):
        self.browser.wait_in_text(f"#{self._step}-target-system-hostname > .pf-v5-c-description-list__text", hostname)

    def check_hostname_not_present(self):
        self.browser.wait_not_present(f"#{self._step}-target-system-hostname")

    @log_step()
    def check_language(self, lang):
        self.browser.wait_in_text(f"#{self._step}-target-system-language > .pf-v5-c-description-list__text", lang)

    @log_step()
    def check_account(self, account):
        self.browser.wait_in_text(f"#{self._step}-target-system-account > .pf-v5-c-description-list__text", account)

    @log_step()
    def check_encryption(self, state):
        self.browser.wait_in_text(f"#{self._step}-target-system-encrypt > .pf-v5-c-description-list__text", state)

    @log_step()
    def check_storage_config(self, scenario):
        self.browser.wait_in_text(f"#{self._step}-target-system-mode > .pf-v5-c-description-list__text", scenario)

    def check_disk(self, disk, text):
        self.browser.wait_text(f"#disk-{disk}", text)

    def check_disk_row(
        self,
        disk,
        mount_point="", parent="", size="", reformat="",
        fs_type=None, is_encrypted=False, rowIndex=None,
        action="", prefix=""
    ):
        action = f"format as {fs_type}" if reformat else action if action else "mount"
        encrypt_text = "encrypted" if is_encrypted and not reformat else "encrypt" if is_encrypted and reformat else ""
        self.browser.wait_visible(
            f"{prefix} table[aria-label={disk}] "
            f"tbody{'' if rowIndex is None else f':nth-child({rowIndex})'} "
            f"td:contains('{mount_point}') + "
            f"td:contains('{parent}') + "
            f"td:contains('{size}') + "
            f"td:contains('{action}') + "
            f"td:contains('{encrypt_text}')"
        )

    def check_disk_row_not_present(self, disk, mount):
        self.browser.wait_not_present(f"table[aria-label={disk}] td:contains({mount})")
