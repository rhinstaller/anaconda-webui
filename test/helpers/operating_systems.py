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
from storage import StorageUtils
from utils import get_pretty_name


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
        self.assertEqual(vda3_root["size"], f"{root_one_size!s}G")

        # Select second OS grub entry
        if self.is_efi:
            debian_boot_entry = m.execute("efibootmgr | grep debian | sed -nE 's/^Boot([0-9]+)\\*.*/\\1/p'").strip()
            m.execute(f"efibootmgr -n {debian_boot_entry}")
        else:
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
        self.assertEqual(vda1["size"], f"{root_two_size!s}G")

        vda15 = next(part for part in vda["children"] if part["name"] == "vda15")
        self.assertEqual(vda15["mountpoints"], ["/boot/efi"])
