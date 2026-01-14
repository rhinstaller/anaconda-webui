# Copyright (C) 2023 Red Hat, Inc.
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

import json
import os
import subprocess
import sys
import tempfile

# import Cockpit's machinery for test VMs and its browser test API
TEST_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(TEST_DIR)
BOTS_DIR = f'{ROOT_DIR}/bots'
sys.path.append(os.path.join(TEST_DIR, "common"))
sys.path.insert(0, os.path.join(TEST_DIR, "helpers"))
sys.path.append(os.path.join(os.path.dirname(TEST_DIR), "bots/machine"))

from installer import Installer
from language import Language
from machine_install import VirtInstallMachine
from payload_dnf import PayloadDNFDBus
from progress import Progress
from storage import Storage
from testlib import MachineCase, wait  # pylint: disable=import-error
from timezone import DateAndTime
from users import Users
from utils import add_public_key

pixel_tests_ignore = ["#anaconda-screen-review-target-system-timezone"]


class VirtInstallMachineCase(MachineCase):
    # The boot modes in which the test should run
    boot_modes = ["bios"]
    is_efi = os.environ.get("TEST_FIRMWARE", "bios") == "efi"
    report_to_wiki = os.path.exists(os.path.join(TEST_DIR, "report.json"))
    MachineCase.machine_class = VirtInstallMachine
    report_file = os.path.join(TEST_DIR, "report.json")

    def partition_disk(self):
        """ Override this method to partition the disk """
        pass

    @property
    def temp_dir(self):
        """Get temp directory for libvirt resources

        We need to set the directory based on the fact if the test is started in the toolbx
        """
        # toolbox compatibility: /tmp is shared with the host, but may be too small for big overlays (tmpfs!)
        # $HOME is shared, but we don't want to put our junk there (NFS, backups)
        # /var/tmp is not shared with the host but the right place; just in case session libvirtd is already
        # running, use the shared path so that the daemon can actually see our overlay.
        # But this only makes sense if the host also has /run/host set up (toolbox ships a tmpfiles.d)
        if os.path.exists("/run/host/var/tmp") and os.path.exists("/run/host/run/host"):
            return "/run/host/var/tmp"
        return "/var/tmp"

    @classmethod
    def setUpClass(cls):
        cls.ext_logging = bool(int(os.environ.get('EXTENDED_LOGGING', '0')))

    def setUp(self):
        method = getattr(self, self._testMethodName)
        boot_modes = getattr(method, "boot_modes", ["bios"])
        self.disk_images = getattr(method, "disk_images", [("", 15)])

        if self.is_efi and "efi" not in boot_modes:
            self.skipTest("Skipping for EFI boot mode")
        elif not self.is_efi and "bios" not in boot_modes:
            self.skipTest("Skipping for BIOS boot mode")

        if "TestPayloadDNF" in self.__class__.__name__:
            if os.environ.get("TEST_PAYLOAD", None) != "dnf":
                self.skipTest("Skipping DNF payload test when not using DNF payload")

        # FIXME: running this in destructive tests fails because the SSH session closes before this is run
        if self.is_nondestructive():
            self.addCleanup(self.resetUsers)
            self.addCleanup(self.resetStorage)
            self.addCleanup(self.resetLanguage)
            self.addCleanup(self.resetMisc)
            self.addCleanup(self.resetTimezone)
            if os.environ.get("TEST_PAYLOAD", None) == "dnf":
                self.addCleanup(self.resetPayloadDNF)

        super().setUp()

        m = self.machine
        b = self.browser
        s = Storage(b, m)

        self.addAllDisks()
        s.udevadm_settle()

        # Wait for minimum /dev/vda to be detected before proceeding
        wait(lambda: "vda" in m.execute("ls /dev"), tries=5, delay=5)

        partition_disk_method_name = f"_{self._testMethodName}_partition_disk"
        if getattr(self, partition_disk_method_name, None):
            self.partition_disk = getattr(self, partition_disk_method_name)
            self.partition_disk()
            s.udevadm_settle()

        s.dbus_scan_devices()

        # Set the first disk as the installation target
        s.dbus_set_selected_disk("vda")

        self.resetLanguage()

        self.allow_journal_messages('.*cockpit.bridge-WARNING: Could not start ssh-agent.*')
        self.installation_finished = False

        if not self.is_nondestructive():
            # Assume destructive tests may reboot the machine and ignore errors related to that
            self.allow_browser_errors(".*client closed.*")
            self.allow_browser_errors(".*Server has closed the connection.*")

    def add_disk(self, size, backing_file=None, target="vda"):
        image = self._create_disk_image(size, backing_file=backing_file)
        subprocess.check_call([
            "virt-xml", "-c",  "qemu:///session", self.machine.label,
            "--update", "--add-device", "--disk", f"{image},format=qcow2,target={target}"
        ])

        return image

    def rem_disk(self, disk):
        subprocess.check_call([
            "virt-xml", "-c", "qemu:///session", self.machine.label,
                "--update", "--remove-device", "--disk", disk
        ])
        os.remove(disk)

    def _create_disk_image(self, size, image_path=None, backing_file=None):
        if not image_path:
            _, image_path = tempfile.mkstemp(suffix='.qcow2', prefix=f"disk-anaconda-{self.machine.label}", dir=self.temp_dir)
        subprocess.check_call([
            "qemu-img", "create", "-f", "qcow2",
            *(["-o", f"backing_file={backing_file},backing_fmt=qcow2"] if backing_file else []),
            image_path,
            f"{size}G"
        ])
        return image_path

    def resetLanguage(self):
        m = self.machine
        b = self.browser
        lang = Language(b, m)
        lang.dbus_set_language("en_US.UTF-8")
        lang.dbus_set_locale("en_US.UTF-8")
        lang.dbus_set_compositor_layouts(["us"])
        lang.dbus_reset_xlayouts()
        lang.dbus_reset_virtual_console_keymap()

    def resetUsers(self):
        m = self.machine
        b = self.browser
        users = Users(b, m)
        users.dbus_clear_users()

    def resetTimezone(self):
        m = self.machine
        b = self.browser
        dt = DateAndTime(b, m)
        dt.dbus_set_ntp_enabled(True)

    def addAllDisks(self):
        # Add installation target disks
        for index, (disk, size) in enumerate(self.disk_images):
            target = f"vd{chr(97 + index)}"
            backing_file = os.path.join(BOTS_DIR, f"./images/{disk}") if disk else None
            # Download the image if it doesn't exist
            if backing_file and not os.path.exists(backing_file):
                subprocess.check_call([os.path.join(BOTS_DIR, "image-download"), disk])
            self.add_disk(size, backing_file, target)

        # Select the disk as boot device
        subprocess.check_call([
            "virt-xml", "-c", "qemu:///session",
            self.machine.label, "--edit", "--boot", "hd"
        ])

    def removeAllDisks(self):
        # Remove all disks
        domblklist = subprocess.getoutput(
            f"virsh domblklist {self.machine.label}",
        )
        for line in domblklist.splitlines():
            name = line.split()[0]
            if "vd" in name:
                file = line.split()[1]
                self.rem_disk(file)

    def resetStorage(self):
        # Ensures that anaconda has the latest storage configuration data
        m = self.machine
        b = self.browser
        s = Storage(b, m)

        self.removeAllDisks()
        s.dbus_reset_scenario()
        # Create an AUTOMATIC partitioning because MANUAL partitioning tests might take the last created
        s.dbus_create_partitioning("AUTOMATIC")
        s.dbus_reset_selected_disks()
        # CLEAR_PARTITIONS_DEFAULT = -1
        s.dbus_set_initialization_mode(-1)
        s.dbus_scan_devices()

    def resetMisc(self):
        # Restart cockpit-ws/cockpit-bridge to avoid crashes in the next test
        m = self.machine

        m.execute("systemctl restart webui-cockpit-ws.service")

    def resetPayloadDNF(self):
        m = self.machine
        dnf_dbus = PayloadDNFDBus(m)
        dnf_dbus.dbus_reset_to_default_environment("server-product-environment")

    def downloadLogs(self):
        if not self.ext_logging:
            return

        self.logs_dir = os.path.join('./test_logs', f'{self.__class__.__name__}.{self._testMethodName}')
        if not os.path.isdir(self.logs_dir):
            os.makedirs(self.logs_dir)

        self.machine.download('/tmp/anaconda.log', 'anaconda.log', self.logs_dir)
        self.machine.download('/tmp/packaging.log', 'packaging.log', self.logs_dir)
        self.machine.download('/tmp/storage.log', 'storage.log', self.logs_dir)
        self.machine.download('/tmp/dbus.log', 'dbus.log', self.logs_dir)
        self.machine.download('/tmp/syslog', 'syslog', self.logs_dir)
        try:
            self.machine.download('/tmp/anaconda-tb-*', '.', self.logs_dir)
        except subprocess.CalledProcessError:
            pass

    def handleReboot(self):
        """
        Method for rebooting into the installed system.

        Should be called when installation is finished. Performs necessary steps
        so the test can continue with checking installed system.
        """
        add_public_key(self.machine)
        self.downloadLogs()
        self.installation_finished = True
        p = Progress(self.browser)
        p.reboot()

        # The installed machine does not need to skip the nologin check
        del os.environ["TEST_ALLOW_NOLOGIN"]
        self.addCleanup(lambda: os.environ.__setitem__("TEST_ALLOW_NOLOGIN", "1"))
        self.machine.wait_reboot()

    def selectBootMenuEntry(self, entry):
        grub_cfg = """
        GRUB_DEFAULT=saved
        GRUB_TIMEOUT=0
        GRUB_HIDDEN_TIMEOUT=0
        GRUB_HIDDEN_TIMEOUT_QUIET=true
        """

        self.write_file("/etc/default/grub", grub_cfg)
        self.machine.execute(f"grub2-set-default {entry}")

    def install(self, needs_confirmation, button_text="Install"):
        b = self.browser
        m = self.machine

        i = Installer(b, m)
        p = Progress(b)

        i.begin_installation(button_text=button_text, needs_confirmation=needs_confirmation)
        with b.wait_timeout(300):
            p.wait_done()

        # FIXME: https://bugzilla.redhat.com/show_bug.cgi?id=2325707
        # This should be removed from the test
        if self.is_efi:
            # Add efibootmgr entry for the second OS
            distro_name = self.disk_images[0][0].split("-")[0]
            m.execute(f"efibootmgr -c -d /dev/vda -p 15 -L {distro_name} -l '/EFI/{distro_name}/shimx64.efi'")
            # Select the Fedora grub entry for first boot
            m.execute("efibootmgr -n 0002")

        self.handleReboot()

    def appendResultsToReport(self):
        with open(self.report_file, "r+") as f:
            test_name = f"{self.__class__.__name__}.{self._testMethodName}"
            firmware = "UEFI" if self.is_efi else "BIOS"
            arch = "x86_64"
            error = super().getError()
            status = "fail" if error else "pass"
            # Add the new entry in the "tests" array in the JSON report file
            data = json.load(f)
            new_entry = {
                "arch": arch,
                "test_name": test_name,
                "firmware": firmware,
                "status": status,
                "error": error,
            }
            data["tests"].append(new_entry)
            f.seek(0)
            json.dump(data, f, indent=4)
            f.truncate()

    def tearDown(self):
        if not self.installation_finished:
            self.downloadLogs()

        if self.report_to_wiki:
            self.appendResultsToReport()

        super().tearDown()


def run_boot(*modes):
    """
    Decorator to run tests only on specific boot modes ('bios', 'efi').
    The VirtMachine has self.is_efi = True/False set.
    We need to skip the test if self.is_efi is True but 'efi' is not in the modes list.

    The absence of the decorator is equivalent to run_boot("bios").

    :param modes: Boot modes in which the test should run (e.g., "bios", "efi").
    """
    def decorator(func):
        func.boot_modes = list(modes)
        return func
    return decorator

def disk_images(disks):
    """
    Decorator to add installation target disks to the test.

    :param disks: List of tuples with disk image OS to be used as backing file and size in GB.
    If the disk image OS is not provided an empty disk will be created.
    """
    def decorator(func):
        func.disk_images = list(disks)
        return func
    return decorator
