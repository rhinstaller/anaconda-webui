# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from steps import SOFTWARE_SELECTION

PAYLOADS_SERVICE = "org.fedoraproject.Anaconda.Modules.Payloads"
PAYLOADS_INTERFACE = PAYLOADS_SERVICE
PAYLOADS_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Payloads"

PAYLOAD_DNF_INTERFACE = "org.fedoraproject.Anaconda.Modules.Payloads.Payload.DNF"


class PayloadDNFDBus():
    def __init__(self, machine):
        self.machine = machine
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

    def _get_active_payload(self):
        """Get the active payload object path."""
        ret = self.machine.execute(
            f'busctl --address="{self._bus_address}" '
            f'get-property '
            f'{PAYLOADS_SERVICE} '
            f'{PAYLOADS_OBJECT_PATH} '
            f'{PAYLOADS_INTERFACE} ActivePayload'
        )
        return ret.split('s ')[1].strip().strip('"')

    def dbus_set_packages_selection(self, environment):
        """Set the packages selection via D-Bus.

        :param environment: environment ID to set
        """
        payload_path = self._get_active_payload()

        # Build the structure for busctl: a{sv} (dictionary of string to variant)
        # Format: a{sv} N "key1" s "value1" "key2" as N "value2_1" ...
        # For empty array, use "as 0"
        # Structure: a{sv} 2 "environment" s "server-product-environment" "groups" as 0
        self.machine.execute(
            f'busctl --address="{self._bus_address}" '
            f'set-property '
            f'{PAYLOADS_SERVICE} '
            f'{payload_path} '
            f'{PAYLOAD_DNF_INTERFACE} '
            f'PackagesSelection '
            f'a{{sv}} 2 "environment" s "{environment}" "groups" as 0'
        )

    def dbus_reset_to_default_environment(self, environment="server-product-environment"):
        """Reset packages selection to default environment with empty groups.

        :param environment: environment ID to set (default: server-product-environment)
        """
        self.dbus_set_packages_selection(environment)


class PayloadDNF():
    def __init__(self, browser):
        self.browser = browser
        self._step = SOFTWARE_SELECTION

    def check_selected_environment(self, environment):
        env_id = f"{self._step}-environment-{environment}"
        self.browser.wait_visible(f"#{env_id}.pf-m-selected")

    def select_environment(self, environment):
        env_id = f"{self._step}-environment-{environment}"
        self.browser.click(f"#{env_id}")
        self.browser.wait_visible(f"#{env_id}.pf-m-selected")

    def check_not_selected_group(self, group):
        """Check that the specified groups are not selected."""
        group_id = f"{self._step}-group-{group}"
        self.browser.wait_visible(f"#{group_id}:not(.pf-m-selected)")

    def check_group_selected(self, group):
        """Check if a specific group is selected."""
        group_id = f"{self._step}-group-{group}"
        self.browser.wait_visible(f"#{group_id}.pf-m-selected")

    def select_group(self, group):
        """Select a group by clicking on it."""
        group_id = f"{self._step}-group-{group}"
        self.browser.click(f"#{group_id}")
        self.check_group_selected(group)

    def check_first_optional_group(self, group):
        """Check that a specific group is the first item in the optional groups menu."""
        optional_groups_id = f"{self._step}-optional-groups"
        group_id = f"{self._step}-group-{group}"
        # Check that the optional groups menu exists
        self.browser.wait_visible(f"#{optional_groups_id} li:first-of-type #{group_id}")
