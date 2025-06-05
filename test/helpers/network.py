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

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

NETWORK_SERVICE = "org.fedoraproject.Anaconda.Modules.Network"
NETWORK_INTERFACE = NETWORK_SERVICE
NETWORK_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Network"


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
