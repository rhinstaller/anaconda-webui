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

from storage import Storage


 # ruff: noqa: E501
class WindowsOS:
    WINDOWS_SFDISK = """
label: gpt
label-id: DB12B2A4-5E98-4F12-97A2-424EFC6869C1
device: /dev/vda
unit: sectors
first-lba: 34
last-lba: 31457246
sector-size: 512

/dev/vda1 : start=        2048, size=      204800, type=C12A7328-F81F-11D2-BA4B-00A0C93EC93B, uuid=FA98D08B-128A-42AB-AB26-1B10D24F18FD, name="EFI system partition", attrs="GUID:63"
/dev/vda2 : start=      206848, size=       32768, type=E3C9E316-0B5C-4DB8-817D-F92DF00215AE, uuid=E37855A3-07F9-4C2B-909B-EE2D92BC8D39, name="Microsoft reserved partition", attrs="GUID:63"
/dev/vda3 : start=      239616, size=    26031793, type=EBD0A0A2-B9E5-4433-87C0-68B6B72699C7, uuid=9431458E-065F-418F-92F5-30F52A746DC9, name="Basic data partition"
/dev/vda4 : start=    30367744, size=     1085440, type=DE94BBA4-06D1-4D40-A16A-BFD50179D6AC, uuid=CC7E5418-AF67-472F-9BF4-FAD27A94A082, attrs="RequiredPartition GUID:63"
"""

    def __init__(self, machine, browser):
        self.machine = machine
        self.browser = browser

    def partition_disk(self):
        s = Storage(self.browser, self.machine)

        self.machine.execute("echo '%s' | sfdisk /dev/vda" % self.WINDOWS_SFDISK)
        s.dbus_scan_devices()
