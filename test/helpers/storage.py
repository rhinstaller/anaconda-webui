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
import re
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from installer import Installer, InstallerSteps  # pylint: disable=import-error
from step_logger import log_step

STORAGE_SERVICE = "org.fedoraproject.Anaconda.Modules.Storage"
STORAGE_INTERFACE = STORAGE_SERVICE
DISK_INITIALIZATION_INTERFACE = "org.fedoraproject.Anaconda.Modules.Storage.DiskInitialization"
STORAGE_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage"
DISK_INITIALIZATION_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/DiskInitialization"

id_prefix = "installation-method"


class StorageDestination():
    def __init__(self, browser, machine):
        self._step = InstallerSteps.INSTALLATION_METHOD
        self.browser = browser
        self.machine = machine

    @log_step()
    def select_disk(self, disk, selected=True, is_single_disk=False):
        if not self.browser.is_present(f".pf-v5-c-menu[aria-labelledby='{id_prefix}-disk-selector-title']"):
            self.browser.click(f"#{id_prefix}-disk-selector-toggle > button")

        if selected:
            self.browser.click(f"#{id_prefix}-disk-selector-option-{disk}:not(.pf-m-selected)")
        else:
            self.browser.click(f"#{id_prefix}-disk-selector-option-{disk}.pf-m-selected")

        if is_single_disk:
            self.check_single_disk_destination(disk)
        else:
            self.check_disk_selected(disk, selected)

    @log_step()
    def select_none_disks_and_check(self, disks):
        self.browser.click(f"#{id_prefix}-disk-selector-clear")
        for disk in disks:
            self.check_disk_selected(disk, False)

    def check_single_disk_destination(self, disk, capacity=None):
        self.browser.wait_in_text(f"#{id_prefix}-target-disk", disk)
        if capacity:
            self.browser.wait_in_text(f"#{id_prefix}-target-disk", capacity)

    @log_step(snapshot_before=True)
    def check_disk_selected(self, disk, selected=True):
        if selected:
            self.browser.wait_visible(f"#{id_prefix}-selector-form li.pf-v5-c-chip-group__list-item:contains('{disk}')")
        else:
            self.browser.wait_not_present(f"#{id_prefix}-selector-form li.pf-v5-c-chip-group__list-item:contains({disk})")

    def get_disk_selected(self, disk):
        return (
            self.browser.is_present(f"#{id_prefix}-selector-form li.pf-v5-c-chip-group__list-item:contains({disk})") or
            (self.browser.is_present(f"#{id_prefix}-target-disk") and
             disk in self.browser.text(f"#{id_prefix}-target-disk"))
        )

    @log_step()
    def wait_no_disks(self):
        self.browser.wait_in_text("#next-helper-text",
                                  "To continue, select the devices to install to.")

    @log_step()
    def wait_no_disks_detected_not_present(self):
        self.browser.wait_not_present("#no-disks-detected-alert")

    def wait_disk_added(self, disk):
        self.browser.wait_in_text("#disks-changed-alert", f"The following disk was detected: {disk}")

    @log_step(snapshots=True)
    def rescan_disks(self):
        b = self.browser
        b.click(f"#{self._step}-rescan-disks")
        b.wait_visible(f"#{self._step}-rescan-disks.pf-m-disabled")
        # Default 15 seconds is not always enough for re-scanning disks
        with b.wait_timeout(30):
            b.wait_not_present(f"#{self._step}-rescan-disks.pf-m-disabled")

    def check_constraint(self, constraint, required=True):
        if required:
            self.browser.wait_visible(f"ul.cockpit-storage-integration-requirements-hint-list:first-of-type li:contains('{constraint}')")
        else:
            self.browser.wait_visible(f"ul.cockpit-storage-integration-requirements-hint-list:nth-of-type(2) li:contains('{constraint}')")

    def return_to_installation(self):
        self.browser.click("#cockpit-storage-integration-return-to-installation-button")

    def return_to_installation_confirm(self):
        with self.browser.wait_timeout(30):
            self.browser.click("#cockpit-storage-integration-check-storage-dialog-continue")

    def modify_storage(self):
        self.browser.click(f"#{self._step}-modify-storage")

    @log_step(snapshot_before=True)
    def check_disk_visible(self, disk, visible=True):
        if not self.browser.is_present(f".pf-v5-c-menu[aria-labelledby='{id_prefix}-disk-selector-title']"):
            self.browser.click(f"#{id_prefix}-disk-selector-toggle > button")

        if visible:
            self.browser.wait_visible(f"#{id_prefix}-disk-selector-option-{disk}")
        else:
            self.browser.wait_not_present(f"#{id_prefix}-disk-selector-option-{disk}")

        self.browser.click(f"#{id_prefix}-disk-selector-toggle > button")
        self.browser.wait_not_present(f".pf-v5-c-menu[aria-labelledby='{id_prefix}-disk-selector-title']")


class StorageEncryption():
    encryption_id_prefix = "disk-encryption"

    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

    @log_step(snapshot_before=True)
    def check_encryption_selected(self, selected):
        sel = f"#{self.encryption_id_prefix}-encrypt-devices"
        if selected:
            self.browser.wait_visible(sel + ':checked')
        else:
            self.browser.wait_visible(sel + ':not([checked])')

    @log_step(snapshot_before=True)
    def set_encryption_selected(self, selected):
        sel = f"#{self.encryption_id_prefix}-encrypt-devices"
        self.browser.set_checked(sel, selected)

    @log_step(docstring=True)
    def check_post_install_encryption_enabled(self):
        """ Post-install check, encryption is enabled """
        print(self.machine.execute('lsblk'))
        assert 'is active and is in use' in self.machine.execute('cryptsetup status /dev/mapper/luks*')


class StorageUtils(StorageDestination):
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

    @log_step(docstring=True)
    def unlock_storage_on_boot(self, password):
        """ Add keyfile to unlock luks encrypted storage on boot """
        self.machine.write('/mnt/sysroot/root/keyfile', password, perm='0400')
        self.machine.write('/mnt/sysroot/root/add_keyfile.sh', '''
            awk -v "KEY_FILE=/root/keyfile" '{$3=KEY_FILE; print $0}' /etc/crypttab > crypttab_mod
            mv -Z crypttab_mod /etc/crypttab
            chmod 0600 /etc/crypttab
            kernel_file=`grubby --default-kernel`
            kernel_version=`rpm -qf $kernel_file --qf '%{VERSION}-%{RELEASE}.%{ARCH}'`
            initrd_file="/boot/initramfs-${kernel_version}.img"
            dracut -f -I /root/keyfile $initrd_file $kernel_version
            if [ -x /sbin/zipl ]; then
                /sbin/zipl
            fi
        ''')
        self.machine.execute('chroot /mnt/sysroot bash /root/add_keyfile.sh')

    def add_basic_partitioning(self, target="vda", size="1GiB"):
        # Add a partition for "Use free space" scenario to be present
        self.machine.execute(f"sgdisk --new=0:0:+{size} /dev/{target}")
        self.rescan_disks()

    # partitions_params expected structure: [("size", "file system" {, "other mkfs.fs flags"})]
    def partition_disk(self, disk, partitions_params):
        command = f"sgdisk --zap-all {disk}"

        for i, params in enumerate(partitions_params):
            sgdisk = ["sgdisk", f"--new=0:0{':+' + params[0] if params[0] != '' else ':0'}"]

            if params[1] == "biosboot":
                sgdisk.append("--typecode=0:ef02")
            if params[1] == "efi":
                sgdisk.append("--typecode=0:ef00")

            sgdisk.append(disk)

            command += f"\n{' '.join(sgdisk)}"

            if params[1] not in ("biosboot", None):
                if params[1] == "lvmpv":
                    mkfs = ["pvcreate"]
                else:
                    if params[1] == "efi":
                        fs = "vfat"
                    else:
                        fs = params[1]
                    mkfs = [f"mkfs.{fs}"]

                # force flag
                if params[1] in ["xfs", "btrfs", "lvmpv"]:
                    mkfs.append("-f")
                elif params[1] in ["ext4", "etx3", "ext2", "ntfs"]:
                    mkfs.append("-F")

                # additional mkfs flags
                if len(params) > 2:
                    mkfs += params[2:]

                mkfs.append(f"{disk}{i + 1}")
                command += f"\n{' '.join(mkfs)}"

        self.machine.execute(command)

    def udevadm_settle(self):
        # Workaround to not have any empty mountpoint labels
        self.machine.execute("""
        udevadm trigger
        udevadm settle --timeout=120
        """)

    def set_partition_uuid(self, disk, partition, uuid):
        self.machine.execute(f"sfdisk --part-uuid {disk} {partition} {uuid}")


class StorageDBus():
    def __init__(self, machine):
        self.machine = machine
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

    def dbus_scan_devices(self):
        task = self.machine.execute(f'busctl --address="{self._bus_address}" \
            call \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH} \
            {STORAGE_INTERFACE} ScanDevicesWithTask')
        task = task.splitlines()[-1].split()[-1]

        self.machine.execute(f'busctl --address="{self._bus_address}" \
            call \
            {STORAGE_SERVICE} \
            {task} \
            org.fedoraproject.Anaconda.Task Start')

    def dbus_get_usable_disks(self):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            call \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH}/DiskSelection \
            {STORAGE_INTERFACE}.DiskSelection GetUsableDisks')

        return re.findall('"([^"]*)"', ret)

    def dbus_reset_selected_disks(self):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH}/DiskSelection \
            {STORAGE_INTERFACE}.DiskSelection SelectedDisks as 0')

    def dbus_reset_partitioning(self):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            call \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH} \
            {STORAGE_INTERFACE} ResetPartitioning')

    def dbus_create_partitioning(self, method="MANUAL"):
        return self.machine.execute(f'busctl --address="{self._bus_address}" \
            call \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH} \
            {STORAGE_INTERFACE} CreatePartitioning s {method}')

    def dbus_get_applied_partitioning(self):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property  \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH} \
            {STORAGE_INTERFACE} AppliedPartitioning')

        return ret.split('s ')[1].strip().strip('"')

    def dbus_get_created_partitioning(self):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property  \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH} \
            {STORAGE_INTERFACE} CreatedPartitioning')

        res = ret[ret.find("[") + 1:ret.rfind("]")].split()
        return [item.strip('"') for item in res]

    def dbus_set_initialization_mode(self, value):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property \
            {STORAGE_SERVICE} \
            {DISK_INITIALIZATION_OBJECT_PATH} \
            {DISK_INITIALIZATION_INTERFACE} InitializationMode i -- {value}')


class StorageScenario():
    def __init__(self, browser, machine):
        self.machine = machine
        self.browser = browser

    def _partitioning_selector(self, scenario):
        return f"#{id_prefix}-scenario-" + scenario

    def wait_scenario_visible(self, scenario, visible=True):
        if visible:
            self.browser.wait_visible(self._partitioning_selector(scenario))
        else:
            self.browser.wait_not_present(self._partitioning_selector(scenario))

    def wait_scenario_available(self, scenario, available=True):
        if available:
            self.browser.wait_visible(f"{self._partitioning_selector(scenario)}:not([disabled])")
        else:
            self.browser.wait_visible(f"{self._partitioning_selector(scenario)}:disabled")

    @log_step(snapshot_before=True)
    def check_partitioning_selected(self, scenario):
        self.browser.wait_visible(self._partitioning_selector(scenario) + ":checked")

    @log_step(snapshot_before=True)
    def set_partitioning(self, scenario):
        self.browser.click(self._partitioning_selector(scenario))
        self.browser.wait_visible(self._partitioning_selector(scenario) + ":checked")


class StorageReclaimDialog():
    def __init__(self, browser):
        self.browser = browser

    def reclaim_check_device_row(self, name, location="", deviceType=None, space=None):
        self.browser.wait_visible(
            f"#reclaim-space-modal-table td[data-label=Name]:contains({name}) + "
            f"td[data-label=Location]:contains({location}) + "
            f"td[data-label=Type]:contains({deviceType}) + "
            f"td[data-label=Space]:contains({space})"
        )

    def reclaim_remove_device(self, device):
        self.browser.click(f"#reclaim-space-modal-table tr:contains('{device}') button[aria-label='delete']")

    def reclaim_check_action_present(self, device, action, present=True):
        selector = f"#reclaim-space-modal-table tr:contains('{device}') td[data-label=Actions]"
        if present:
            self.browser.wait_in_text(selector, action)
        else:
            self.browser.wait_not_in_text(selector, action)

    def reclaim_undo_action(self, device):
        self.browser.click(f"#reclaim-space-modal-table tr:contains('{device}') button[aria-label='undo']")

    def reclaim_check_available_space(self, space):
        self.browser.wait_text("#reclaim-space-modal-hint-available-free-space", space)

    def reclaim_check_checkbox(self, value, isDisabled):
        self.browser.wait_visible("#reclaim-space-checkbox:checked" if value else "#reclaim-space-checkbox:not(:checked)")

        if isDisabled:
            self.browser.wait_visible("#reclaim-space-checkbox:disabled")
        else:
            self.browser.wait_visible("#reclaim-space-checkbox:not(:disabled)")

    def reclaim_modal_check_submit_disabled(self, disabled):
        if disabled:
            self.browser.wait_visible("button:contains('Reclaim space'):disabled")
        else:
            self.browser.wait_visible("button:contains('Reclaim space'):not(:disabled)")

    def reclaim_modal_submit(self):
        self.browser.click("button:contains('Reclaim space')")


class StorageMountPointMapping(StorageDBus, StorageDestination):
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

        StorageDBus.__init__(self, machine)
        StorageDestination.__init__(self, browser, machine)

    def table_row(self, row):
        return f"#mount-point-mapping-table-row-{row}"

    def disks_loaded(self, disks):
        usable_disks = self.dbus_get_usable_disks()
        for disk in usable_disks:
            disks_dict = dict(disks)
            if disk not in disks_dict:
                return False

        return True

    def check_mountpoint_row(self, row, mountpoint=None, device=None, reformat=None, format_type=None):
        if mountpoint:
            constrained = ["/", "/boot", "/boot/efi", "swap"].count(mountpoint)
            self.check_mountpoint_row_mountpoint(row, mountpoint, constrained)
        if device:
            self.check_mountpoint_row_device(row, device)
        if reformat:
            self.check_mountpoint_row_reformat(row, reformat)
        if format_type:
            self.check_mountpoint_row_format_type(row, format_type)

    def select_disks(self, disks):
        self.browser.wait(lambda: self.disks_loaded(disks))

        for disk in disks:
            current_selection = self.get_disk_selected(disk[0])
            if current_selection != disk[1]:
                self.select_disk(disk[0], disk[1], len(disks) == 1)

    def select_mountpoint(self, disks, encrypted=False):
        self.select_disks(disks)

        self.set_partitioning("mount-point-mapping")

        i = Installer(self.browser, self.machine)
        i.next(next_page=i.steps.CUSTOM_MOUNT_POINT)

        with self.browser.wait_timeout(30):
            if not encrypted:
                self.browser.wait_visible("#mount-point-mapping-table")
            else:
                self.browser.wait_not_present("#unlock-device-dialog")

    def select_mountpoint_row_mountpoint(self, row, mountpoint):
        self.browser.set_input_text(f"{self.table_row(row)} td[data-label='Mount point'] input", mountpoint)

    def select_mountpoint_row_device(self, row, device):
        selector = f"{self.table_row(row)} .pf-v5-c-select__toggle"

        self.browser.click(f"{selector}:not([disabled]):not([aria-disabled=true])")
        select_entry = f"{selector} + ul button[data-value='{device}']"
        self.browser.click(select_entry)
        self.browser.wait_in_text(f"{selector} .pf-v5-c-select__toggle-text", device)

    def toggle_mountpoint_row_device(self, row):
        self.browser.click(f"{self.table_row(row)}-device-select-toggle")

    def check_mountpoint_row_device(self, row, device):
        self.browser.wait_text(f"{self.table_row(row)} .pf-v5-c-select__toggle-text", device)

    def check_mountpoint_row_mountpoint(self, row, mountpoint, constrained=True):
        if constrained:
            self.browser.wait_text(f"{self.table_row(row)}-mountpoint", mountpoint)
        else:
            self.browser.wait_val(f"{self.table_row(row)}-mountpoint", mountpoint)

    def check_mountpoint_row_format_type(self, row, format_type):
        self.toggle_mountpoint_row_device(row)
        self.browser.wait_in_text(f"{self.table_row(row)} ul li button.pf-m-selected", format_type)
        self.toggle_mountpoint_row_device(row)

    def check_mountpoint_row_device_available(self, row, device, available=True, disabled=False):
        disabled_selector = ".pf-m-disabled" if disabled else ":not(.pf-m-disabled)"

        self.toggle_mountpoint_row_device(row)
        main_selector = f"{self.table_row(row)} ul li button"
        if available:
            self.browser.wait_visible(f"{main_selector}{disabled_selector}:contains({device})")
        else:
            self.browser.wait_not_present(f"{main_selector}:contains({device})")
        self.toggle_mountpoint_row_device(row)

    def unlock_device(self, passphrase, encrypted_devices=None, successfully_unlocked_devices=None):
        if encrypted_devices is None:
            encrypted_devices = []
        if successfully_unlocked_devices is None:
            successfully_unlocked_devices = []
        # FIXME: https://github.com/patternfly/patternfly-react/issues/9512
        b = self.browser
        for device in encrypted_devices:
            b.wait_in_text(
                "#unlock-device-dialog-luks-devices",
                device,
            )
        b.set_input_text("#unlock-device-dialog-luks-passphrase[type=password]", passphrase)
        b.click("#unlock-device-dialog-submit-btn")
        # Wait for the dialog to either close or stop being in progress
        with b.wait_timeout(30):
            if successfully_unlocked_devices == encrypted_devices:
                b.wait_not_present("#unlock-device-dialog")
                return
            else:
                b.wait_visible("#unlock-device-dialog-submit-btn:not([disabled])")

        # The devices that were successfully unlocked should not not be present
        # in the 'Locked devices' form field
        for device in successfully_unlocked_devices:
            b.wait_not_present(f"#unlock-device-dialog-luks-devices:contains({device})")

        # The locked devices should be present in the 'Locked devices' form field
        for device in list(set(encrypted_devices) - set(successfully_unlocked_devices)):
            b.wait_visible(f"#unlock-device-dialog-luks-devices:contains({device})")

        # The devices that were successfully unlocked should appear in the info alert
        if len(successfully_unlocked_devices) > 0:
            b.wait_in_text(
                "#unlock-device-dialog .pf-v5-c-alert.pf-m-info",
                f"Successfully unlocked {', '.join(successfully_unlocked_devices)}."
            )

        # If the user did not unlock any device after submiting the form expect a warning
        if successfully_unlocked_devices == []:
            fail_text = "Passphrase did not match any locked device"
            b.wait_in_text("#unlock-device-dialog .pf-v5-c-helper-text", fail_text)

    def select_mountpoint_row_reformat(self, row, selected=True):
        self.browser.set_checked(f"{self.table_row(row)} td[data-label='Reformat'] input", selected)

    def remove_mountpoint_row(self, row, initial_count):
        self.browser.wait_js_cond(f"ph_count('#mount-point-mapping-table tbody tr') == {initial_count}")
        self.browser.click(f"{self.table_row(row)} button[aria-label='Remove']")
        self.browser.wait_js_cond(f"ph_count('#mount-point-mapping-table tbody tr') == {initial_count - 1}")

    def check_mountpoint_row_reformat(self, row, checked):
        checked_selector = "input:checked" if checked else "input:not(:checked)"
        self.browser.wait_visible(f"{self.table_row(row)} td[data-label='Reformat'] {checked_selector}")

    def add_mountpoint_row(self):
        rows = self.browser.call_js_func("ph_count", '#mount-point-mapping-table tbody tr')
        self.browser.click("button:contains('Add mount')")
        self.browser.wait_js_cond(f"ph_count('#mount-point-mapping-table tbody tr') == {rows + 1}")

    def unlock_all_encrypted(self):
        self.browser.click("#mount-point-mapping-unlock-devices-btn")

    def unlock_all_encrypted_skip(self):
        self.browser.click("button:contains('Skip')")

    def wait_mountpoint_table_column_helper(self, row, column, text=None, present=True):
        if present:
            self.browser.wait_in_text(f"#mount-point-mapping-table-row-{row}-{column} .pf-v5-c-helper-text__item.pf-m-error", text)
        else:
            self.browser.wait_not_present(f"#mount-point-mapping-table-row-{row}-{column} .pf-v5-c-helper-text__item.pf-m-error")


class Storage(StorageEncryption, StorageMountPointMapping, StorageScenario, StorageReclaimDialog, StorageUtils):
    def __init__(self, browser, machine):
        StorageEncryption.__init__(self, browser, machine)
        StorageMountPointMapping.__init__(self, browser, machine)
        StorageScenario.__init__(self, browser, machine)
        StorageReclaimDialog.__init__(self, browser)
        StorageUtils.__init__(self, browser, machine)
