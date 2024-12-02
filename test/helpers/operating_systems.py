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

from anacondalib import VirtInstallMachineCase
from storage import Storage, StorageUtils
from utils import get_pretty_name


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


class DualBootHelper_E2E(VirtInstallMachineCase):
    def verifyDualBootDebian(self, root_one_size=None, root_two_size=None):
        b = self.browser
        m = self.machine
        s = StorageUtils(b, m)

        # Expect the new OS is the default grub entry
        pretty_name = get_pretty_name(m)
        self.assertIn("Fedora Linux", pretty_name)

        # Check that the expected partition layout is created on the selected device
        lsblk = s.get_lsblk_json()
        block_devs = lsblk["blockdevices"]
        vda = next(dev for dev in block_devs if dev["name"] == "vda")

        vda2 = next(part for part in vda["children"] if part["name"] == "vda2")
        self.assertEqual(vda2["mountpoints"], ["/boot"])

        vda3 = next(part for part in vda["children"] if part["name"] == "vda3")
        vda3_root = next(part for part in vda3["children"] if "/" in part["mountpoints"])
        self.assertEqual(vda3_root["size"], str(root_one_size) + "G")

        # Select second OS grub entry
        self.selectBootMenuEntry(2)
        m.reboot()
        pretty_name = get_pretty_name(m)
        self.assertIn("Debian GNU/Linux", pretty_name)

        # Check that the pre-existing partitions are still present
        lsblk = s.get_lsblk_json()
        block_devs = lsblk["blockdevices"]
        vda = next(dev for dev in block_devs if dev["name"] == "vda")

        vda1 = next(part for part in vda["children"] if part["name"] == "vda1")
        self.assertEqual(vda1["mountpoints"], ["/"])
        self.assertEqual(vda1["size"], str(root_two_size) + "G")

        vda15 = next(part for part in vda["children"] if part["name"] == "vda15")
        # TODO: add explanation why the /efi mountpoint is present when legacy boot is used
        if self.efi:
            self.assertEqual(vda15["mountpoints"], ["/boot/efi"])
        else:
            self.assertEqual(vda15["mountpoints"], ["/efi", "/boot/efi"])
