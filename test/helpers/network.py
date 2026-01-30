# Copyright (C) 2024 Red Hat, Inc.
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

from testlib import wait

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

NETWORK_SERVICE = "org.fedoraproject.Anaconda.Modules.Network"
NETWORK_INTERFACE = NETWORK_SERVICE
NETWORK_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Network"

WIRED_CONNECTION_NAME = "Wired Connection"

SYSROOT_PATH = "/mnt/sysimage"
NM_SYSTEM_CONNECTIONS_PATH = "/etc/NetworkManager/system-connections"

# cockpit/pkg/networkmanager/interfaces.js
COCKPIT_CHECKPOINT_ROLLBACK_TIME = 7


class NetworkDBus():
    def __init__(self, machine):
        self.machine = machine
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

    def dbus_get_hostname(self):
        return self.machine.execute(
            f'busctl --address="{self._bus_address}" \
                    get-property  \
                    {NETWORK_SERVICE} \
                    {NETWORK_OBJECT_PATH} \
                    {NETWORK_INTERFACE} Hostname'
        )

    def dbus_set_hostname(self, hostname):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property  \
            {NETWORK_SERVICE} \
            {NETWORK_OBJECT_PATH} \
            {NETWORK_INTERFACE} Hostname s {hostname}')

    def dbus_reset_hostname(self):
        self.dbus_set_hostname("''")


# Assumes NetworkManager backend
class Network():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

    def get_the_iface(self):
        """Get the iface name and assert it is the only one."""
        ifaces = set(self.machine.execute("ls /sys/class/net/ | grep -v bonding_masters").strip().split())
        ifaces.discard('lo')
        assert(len(ifaces) == 1)
        return ifaces.pop()

    def check_iface_state(self, iface, key, value, match_type=None):
        """Check the interface is in given state."""
        state = self.machine.execute(f"nmcli -g {key} device show {iface}").strip()
        if match_type == "substr":
            assert value in state
        else:
            assert value == state

    def check_con_settings(self, settings, root=None):
        """Check the connection setting value."""
        con_prefix = ""
        if root:
            # Rename with prefix and copy the connections from the system to the NM
            # directory, and reload the connections by NM
            con_prefix = root.replace('/', '_') + '.'
            self.machine.execute(f"""
            for file in {root}{NM_SYSTEM_CONNECTIONS_PATH}/*; do
                [ -f "$file" ] || continue
                filename=$(basename "$file")
                target_file="{NM_SYSTEM_CONNECTIONS_PATH}/{con_prefix}$filename"
                new_uuid=$(cat /proc/sys/kernel/random/uuid)
                sed -e "s/^id=/id={con_prefix}/" \
                    -e "s/^uuid=.*/uuid=$new_uuid/" \
                    "$file" > "$target_file"
                chmod 0600 "$target_file"
            done
            nmcli connection reload
            """)

        values = []
        for con_name, key, expected_value, match_type in settings:
            value = self.machine.execute(f"nmcli -g {key} connection show '{con_prefix}{con_name}'").strip()
            values.append((expected_value, value, match_type))

        if root:
            # Remove the connections copied from the system
            self.machine.execute(f"""
            rm {NM_SYSTEM_CONNECTIONS_PATH}/{con_prefix}*
            nmcli connection reload
            """)

        for expected_value, value, match_type in values:
            if match_type == "substr":
                assert expected_value in value
            else:
                assert expected_value == value

    def wait_for_con_profile_file(self, file_name, persistent=True, root=""):
        profile_dir = root + ("/etc" if persistent else "/run") + NM_SYSTEM_CONNECTIONS_PATH[4:]
        file_path = f"{profile_dir}/{file_name}.nmconnection"
        wait(lambda: self.machine.execute(f"test -f \"{file_path}\" && echo found").strip() == "found",
             delay=0.3, tries=5)

    def check_con_profile_files(self, con_name, count, persistent=True, root="", file_name=None):
        """Check that profile file for the connection exists.

        con_name: name of the connection or "" to include all connections
        """
        profile_dir = root + ("/etc" if persistent else "/run") + NM_SYSTEM_CONNECTIONS_PATH[4:]
        if file_name:
            cmd = f"grep -l \"id={con_name}\" \"{profile_dir}/{file_name}.nmconnection\" || true"
        else:
            cmd = f"grep -l \"id={con_name}\" {profile_dir}/* || true"
        files_found = self.machine.execute(cmd).strip().split('\n')
        if len(files_found) == 1 and files_found[0] == '':
            n_files_found = 0
        else:
            n_files_found = len(files_found)
        assert n_files_found == count

    def configure_network(self):
        b = self.browser
        b.click("#toggle-kebab")
        b.click("#about-modal-dropdown-item-network")

    def check_no_network_ui(self):
        b = self.browser
        b.click("#toggle-kebab")
        # Wait for the dropdown menu to be visible before checking for the specific item
        b.wait_visible("#toggle-kebab[aria-expanded='true'], .pf-c-dropdown__menu")
        b.wait_not_present("#about-modal-dropdown-item-network")
        b.click("#toggle-kebab")

    def enter_network(self):
        b = self.browser
        self.configure_network()
        b._wait_present("iframe[name='cockpit-network']")
        b.switch_to_frame("cockpit-network")
        b.wait_visible("#networking-interfaces")

    def exit_network(self):
        b = self.browser
        b.switch_to_top()
        b.click("#cockpit-network-configuration-modal button:contains('Close')")
        b.wait_not_present("#cockpit-network-configuration-modal")

    def select_iface(self, iface):
        b = self.browser
        b.click(f"#networking-interfaces tr[data-interface='{iface}'] button")
        b.wait_visible("#network-interface")

    def set_autoreconnect(self, autoreconnect):
        b = self.browser
        b.set_checked('#autoreconnect', autoreconnect)
        if autoreconnect:
            b.wait_visible('#autoreconnect:checked')
        else:
            b.wait_visible('#autoreconnect:not(:checked)')

    def preinstall_connection_test(self, installer, iface, con_name, configured=False):
        n = self
        i = installer

        # The automatic connection from initramfs is active on the iface.
        n.check_iface_state(iface, "GENERAL.CONNECTION", con_name)
        n.check_iface_state(iface, "GENERAL.STATE", "connected", match_type="substr")

        # Connection was configured by boot options
        if configured:
            # The configured initramfs connection was persisted by the backend
            n.check_con_profile_files(con_name, 1, file_name=con_name)
            # Check there is only single persistent profile
            n.check_con_profile_files("", 1)
        else:
            # There is single non-persistent connection created in initramfs
            n.check_con_profile_files(con_name, 1, persistent=False)
            # There is no persistent profile
            n.check_con_profile_files("", 0)

        n.check_con_settings([
            [con_name, "connection.autoconnect", "yes", None]
        ])

        n.enter_network()
        n.select_iface(iface)
        # Edit the connection
        n.set_autoreconnect(False)
        n.exit_network()

        n.wait_for_con_profile_file(con_name)

        n.check_con_settings([
            [con_name, "connection.autoconnect", "no", None]
        ])

        # The connection is persistent after editing
        n.check_con_profile_files(con_name, 1, file_name=con_name)
        # Check there is only single persistent profile
        n.check_con_profile_files("", 1)

        i.reach(i.steps.REVIEW)

        n.enter_network()
        n.select_iface(iface)
        n.set_autoreconnect(True)
        n.exit_network()
        n.check_con_settings([
            [con_name, "connection.autoconnect", "yes", None]
        ])

    def configure_iface_setting(self, setting_title):
        b = self.browser
        b.click(f"dt:contains('{setting_title}') + dd button")

    def wait_for_iface_setting(self, setting_title, setting_value):
        b = self.browser
        b.wait_in_text(f"dt:contains('{setting_title}') + dd", setting_value)

    def set_mtu_on_iface(self, iface, mtu):
        n = self
        n.enter_network()
        n.select_iface(iface)
        n.set_mtu(mtu)
        n.wait_for_iface_setting("MTU", mtu)
        n.exit_network()

    def set_mtu(self, mtu):
        b = self.browser
        self.configure_iface_setting("MTU")
        b.wait_visible("#network-mtu-settings-dialog")
        # wait until dialog initialized
        b.wait_visible("#network-mtu-settings-dialog button[aria-label=Close]")
        b.wait_visible("#network-mtu-settings-custom")
        b.set_checked('#network-mtu-settings-custom', val=True)
        b.set_input_text('#network-mtu-settings-input', mtu)
        b.click("#network-mtu-settings-save")
        b.wait_not_present("#network-mtu-settings-dialog")

    def wait_onoff(self, sel: str, *, val: bool) -> None:
        self.browser.wait_visible(sel + " input[type=checkbox]" + (":checked" if val else ":not(:checked)"))

    def toggle_onoff(self, sel: str) -> None:
        self.browser.click(sel + " input[type=checkbox]")

    def add_dns_server_to_iface(self, iface, ip):
        n = self
        n.enter_network()
        n.select_iface(iface)
        n.add_dns_server(ip)
        n.exit_network()

    def add_dns_server(self, ip):
        b = self.browser
        self.configure_iface_setting('IPv4')
        b.wait_visible("#network-ip-settings-dialog")
        self.wait_onoff("[data-field=dns]", val=True)
        self.toggle_onoff("[data-field=dns]")
        self.wait_onoff("[data-field=dns_search]", val=False)
        b.click("#network-ip-settings-dns-add")
        b.set_input_text("#network-ip-settings-dns-server-0", ip)
        b.click("#network-ip-settings-save")
        b.wait_not_present("#network-ip-settings-dialog")

    def keep_connection(self):
        # Wait for dialog to appear and dismiss it
        b = self.browser
        with b.wait_timeout(60):
            b.click("#confirm-breaking-change-popup button:contains('Keep connection')")
        b.wait_not_present("#confirm-breaking-change-popup")

    def disable_ipv4_on_iface(self, iface):
        n = self
        n.enter_network()
        n.select_iface(iface)
        self.disable_ipv4()
        n.keep_connection()
        n.exit_network()

    def disable_ipv4(self):
        b = self.browser
        self.configure_iface_setting('IPv4')
        b.wait_visible("#network-ip-settings-dialog")
        b.select_from_dropdown("#network-ip-settings-select-method", "disabled")
        b.click("#network-ip-settings-save")
        b.wait_not_present("#network-ip-settings-dialog")
