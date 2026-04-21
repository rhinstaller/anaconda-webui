# Copyright (C) 2022 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from network import NetworkDBus
from step_logger import log_step
from steps import REVIEW
from storage import StorageDBus


class Review(NetworkDBus, StorageDBus):
    def __init__(self, browser, machine):
        self.browser = browser
        self._step = REVIEW

        NetworkDBus.__init__(self, machine)
        StorageDBus.__init__(self, machine)

    @log_step()
    def check_hostname(self, hostname):
        self.browser.wait_in_text(f"#{self._step}-target-system-hostname > .pf-v6-c-description-list__text", hostname)

    def check_hostname_not_present(self):
        self.browser.wait_not_present(f"#{self._step}-target-system-hostname")

    @log_step()
    def check_language(self, lang):
        self.browser.wait_in_text(f"#{self._step}-target-system-language > .pf-v6-c-description-list__text", lang)

    @log_step()
    def check_account(self, account):
        self.browser.wait_in_text(f"#{self._step}-target-system-account > .pf-v6-c-description-list__text", account)

    @log_step()
    def check_timezone(self, timezone):
        self.browser.wait_in_text(f"#{self._step}-target-system-timezone > .pf-v6-c-description-list__text", timezone)

    @log_step()
    def check_timezone_not_present(self):
        self.browser.wait_not_present(f"#{self._step}-target-system-timezone")

    @log_step()
    def check_storage_config(self, scenario):
        self.browser.wait_in_text(f"#{self._step}-target-system-mode > .pf-v6-c-description-list__text", scenario)

    def check_disk(self, disk, text, prefix=""):
        self.browser.wait_text(f"{prefix} #disk-{disk}", text)

    def check_disk_row(
        self,
        disk,
        mount_point="", parent="", size="", reformat="",
        fs_type=None, is_encrypted=False,
        action="", prefix=""
    ):
        table = f"{prefix} #storage-review-table-{disk}".strip()

        action_text = f"format as {fs_type}" if reformat else action or "mount"
        encrypt_text = "encrypted" if is_encrypted and not reformat else "encrypt" if is_encrypted and reformat else ""

        # Action rows (delete/resize) have data-action and no data-mount;
        # mount rows have data-mount and no data-action.
        # Detect action rows: explicit non-default action, no mount_point, no reformat.
        is_action_row = action and action not in ("mount", "biosboot") and not mount_point and not reformat
        if is_action_row:
            row = f'{table} tr[data-device="{parent}"][data-action]'
        elif mount_point:
            row = f'{table} tr[data-mount="{mount_point}"]'
        else:
            row = f'{table} tr[data-device="{parent}"][data-mount]'

        self.browser.wait_visible(row)

        for text in (parent, str(size) if size != "" else "", action_text, encrypt_text, mount_point):
            if text is not None and str(text) != "":
                self.browser.wait_in_text(row, str(text))

    def check_disk_row_not_present(self, disk, mount):
        self.browser.wait_not_present(f'#storage-review-table-{disk} tr[data-mount="{mount}"]')

    def check_deleted_system(self, os_name):
        self.browser.wait_in_text(f"#{self._step}-target-storage-note li", os_name)

    def check_affected_system(self, os_name, partitions):
        self.browser.wait_in_text(f"#{self._step}-target-storage-note li", f"Deletion of certain partitions may prevent {os_name}")
        deleted_partitions = ', '.join([f'{device} ({", ".join(parts)})' for device, parts in partitions])
        self.browser.wait_in_text(f"#{self._step}-target-storage-note li", deleted_partitions)

    def check_resized_system(self, os_name, partitions):
        self.browser.wait_in_text(f"#{self._step}-target-storage-note li", f"Resizing the following partitions from {os_name}")
        resized_partitions = ', '.join(partitions)
        self.browser.wait_in_text(f"#{self._step}-target-storage-note li", resized_partitions)

    def check_all_erased_checkbox_label(self):
        usable_disks = self.dbus_get_usable_disks()
        expected_text = "I understand that all existing data will be erased"
        if len(usable_disks) > 1:
            expected_text = "I understand that all existing data will be erased from the selected disks"
        self.browser.wait_text(f"label[for={self._step}-next-confirmation-checkbox]", expected_text)

    def check_some_erased_checkbox_label(self):
        self.browser.wait_text(f"label[for={self._step}-next-confirmation-checkbox]", "I understand that some existing data will be erased")

    def check_some_resized_checkbox_label(self):
        self.browser.wait_text(f"label[for={self._step}-next-confirmation-checkbox]", "I understand that some partitions will be modified")

    def check_checkbox_not_present(self):
        self.browser.wait_not_present(f"#{self._step}-next-confirmation-checkbox")

    def check_disk_mount_point_helper_text(self, disk, mount_point, text=None, present=True):
        if present:
            self.browser.wait_in_text(f"#helper-disk-{disk}[data-path='{mount_point}'] .pf-v6-c-helper-text__item.pf-m-error", text)
        else:
            self.browser.wait_not_present(f"#helper-disk-{disk}[data-path='{mount_point}'] .pf-v6-c-helper-text__item.pf-m-error")

    def check_available_size_error_value(self, size):
        self.browser.wait_in_text(f"#{self._step}-step-notification", f"but only {size}")

    def check_size_error(self, present=True):
        if present:
            self.browser.wait_in_text(f"#{self._step}-step-notification", "Not enough available free space")
        else:
            self.browser.wait_not_present(f"#{self._step}-step-notification")
