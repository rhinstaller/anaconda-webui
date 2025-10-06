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
from testlib import wait  # pylint: disable=import-error

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

NETWORK_SERVICE = "org.fedoraproject.Anaconda.Modules.Network"
NETWORK_INTERFACE = NETWORK_SERVICE
NETWORK_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Network"

HOSTAPD_PIDFILE = "/var/tmp/webui_hostapd_pid"

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


# FIXME move to common/netlib.py when more mature
class Network():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

    def _wait_for_wifi_ifaces(self, number):
        for idx in range(number):
            wait(lambda: self.machine.execute(f"find /sys/class/net/wlan{idx}/address 2>/dev/null || true"))

    def create_wifi_devices(self, number=1):
        self.machine.execute(f"modprobe mac80211_hwsim radios={number}")
        self._wait_for_wifi_ifaces(number)
        self.machine.execute("udevadm trigger; udevadm settle")
        self._wait_for_wifi_ifaces(number)

    def remove_wifi_devices(self):
        self.machine.execute(f"modprobe -r mac80211_hwsim")

    def create_ap(
        self,
        ssid_name,
        interface="wlan0",
        secret="secret123",
    ):

        if os.path.exists(HOSTAPD_PIDFILE):
            raise RuntimeError("Can't run hostapd, found running daemon pid file {HOSTAPD_PIDFILE}")

        conf_file = self.machine.execute("mktemp /var/tmp/hostapd.XXXXX.conf").strip()
        self.machine.write(conf_file, f'''interface={interface}
driver=nl80211
ssid={ssid_name}
channel=6
hw_mode=g
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase={secret}
''')
        self.machine.execute(f"hostapd -P {HOSTAPD_PIDFILE} -dd -B {conf_file}")
        self._wait_for_ssids(interface, [ssid_name])

    def remove_ap(self):
        self.machine.execute(f"kill -TERM `cat {HOSTAPD_PIDFILE}`")

    def get_ssids(self, iface):
        ssid_lines = self.machine.execute(
            f"iw {iface} info | grep ssid || true"
        ).strip().split('\n')
        ssids = [line.removeprefix("ssid").strip() for line in ssid_lines if line]
        return ssids

    def _wait_for_ssids(self, iface, ssids):
        wait(lambda: set(self.get_ssids(iface)) == set(ssids))

    def check_ssids(self, iface, ssids):
        assert set(self.get_ssids(iface)) == set(ssids)
