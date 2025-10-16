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

import json
import os
import re
import sys
import time

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)
BOTS_DIR = f'{HELPERS_DIR}/../../bots'
sys.path.append(BOTS_DIR)



from step_logger import log_step
from steps import CUSTOM_MOUNT_POINT, INSTALLATION_METHOD
from testlib import Error, wait

STORAGE_SERVICE = "org.fedoraproject.Anaconda.Modules.Storage"
STORAGE_INTERFACE = STORAGE_SERVICE
DISK_INITIALIZATION_INTERFACE = "org.fedoraproject.Anaconda.Modules.Storage.DiskInitialization"
STORAGE_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage"
DISK_INITIALIZATION_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Storage/DiskInitialization"

# Default boot partition size for partition preparation (GiB format)
BOOT_PARTITION_DEFAULT_SIZE = '2GiB'
# Default boot partition size for review display (GB format)
BOOT_PARTITION_DEFAULT_SIZE_GB = '2.15 GB'


class StorageDestination():
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

    @log_step(snapshot_before=True)
    def check_disk_selected(self, disk, selected=True, size=None):
        if selected:
            self.browser.wait_visible(f"#{INSTALLATION_METHOD}-target-disk-{disk}")
        else:
            self.browser.wait_not_present(f"#{INSTALLATION_METHOD}-target-disk-{disk}")

        if size is not None:
            self.browser.wait_in_text(f"#{INSTALLATION_METHOD}-target-disk-{disk}", size)

    def check_os_detected(self, disk, value, detected=True):
        disk_sel_selector = f"#{INSTALLATION_METHOD}-target-disk-{disk}"
        if detected:
            self.browser.wait_visible(f"{disk_sel_selector}:contains({value})")
        else:
            self.browser.wait_not_present(f"{disk_sel_selector}:contains({value})")

    @log_step()
    def wait_no_disks(self):
        self.browser.wait_in_text("#next-helper-text",
                                  "To continue, select the devices to install to.")

    @log_step(snapshots=True)
    def rescan_disks(self, expected_disks=None, expect_failure=False):
        b = self.browser
        b.click(f"#{INSTALLATION_METHOD}-change-destination-button")
        b.click(f"#{INSTALLATION_METHOD}-rescan-disks")
        b.wait_visible(f"#{INSTALLATION_METHOD}-rescan-disks[aria-disabled='true']")
        # Default 15 seconds is not always enough for re-scanning disks
        with b.wait_timeout(60):
            b.wait_not_present(f"#{INSTALLATION_METHOD}-rescan-disks[aria-disabled='true']")

        for disk in expected_disks or []:
            b.wait_visible(f"#{INSTALLATION_METHOD}-disk-selection-menu-item-{disk}")

        if not expect_failure:
            b.click(f"#{INSTALLATION_METHOD}-change-destination-modal button:contains('Cancel')")

    def check_constraint(self, constraint, required=True):
        if required:
            self.browser.wait_visible(f"ul.cockpit-storage-integration-requirements-hint-list:first-of-type li:contains('{constraint}')")
        else:
            self.browser.wait_visible(f"ul.cockpit-storage-integration-requirements-hint-list:nth-of-type(2) li:contains('{constraint}')")

    def confirm_entering_cockpit_storage(self):
        self.browser.click("#cockpit-storage-integration-enter-storage-confirm")

    def return_to_installation(self, error=None):
        self.browser.click("#cockpit-storage-integration-return-to-installation-button")
        # FIXME: https://github.com/rhinstaller/anaconda/pull/6234
        # On Fedora-42 re-scanning takes long when there are LVM devices
        # This extra timeout can be removed once the above PR is merged
        with self.browser.wait_timeout(90):
            if error:
                self.browser.wait_in_text("#cockpit-storage-integration-check-storage-dialog", error)
            self.browser.wait_visible("#cockpit-storage-integration-check-storage-dialog-continue:not([disabled])")

    def return_to_installation_confirm(self):
        # FIXME: testBtrfsTopLevelVolume fails sometimes on CI without this workaround
        try:
            with self.browser.wait_timeout(60):
                self.browser.click("#cockpit-storage-integration-check-storage-dialog-continue")
                self.browser.wait_not_present("#cockpit-storage-integration-check-storage-dialog")
        except Error:
            # Retry the click in case the dialog is still present
            self.browser.click("#cockpit-storage-integration-check-storage-dialog-continue")
            self.browser.wait_not_present("#cockpit-storage-integration-check-storage-dialog")

    def return_to_installation_cancel(self):
        self.browser.click("#cockpit-storage-integration-check-storage-dialog-return")
        self.browser.wait_not_present("#cockpit-storage-integration-check-storage-dialog")

    def modify_storage(self):
        self.browser.click("#toggle-kebab")
        self.browser.click("#modify-storage")

    def enter_cockpit_storage(self):
        b = self.browser
        self.modify_storage()
        self.confirm_entering_cockpit_storage()
        b.wait_visible(".cockpit-storage-integration-sidebar")
        b._wait_present("iframe[name='cockpit-storage']")
        b.switch_to_frame("cockpit-storage")
        b._wait_present("#storage.ct-page-fill")

    def exit_cockpit_storage(self):
        self.browser.switch_to_top()
        self.return_to_installation()
        self.return_to_installation_confirm()


class StorageEncryption():
    encryption_id_prefix = "disk-encryption"

    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

    @log_step(snapshot_before=True)
    def check_encryption_selected(self, selected):
        sel = f"#{self.encryption_id_prefix}-encrypt-devices"
        if selected:
            self.browser.wait_visible(f'{sel}:checked')
        else:
            self.browser.wait_visible(f'{sel}:not([checked])')

    @log_step(snapshot_before=True)
    def set_encryption_selected(self, selected):
        sel = f"#{self.encryption_id_prefix}-encrypt-devices"
        self.browser.set_checked(sel, selected)

    @log_step(docstring=True)
    def check_post_install_encryption_enabled(self):
        """ Post-install check, encryption is enabled """
        print(self.machine.execute('lsblk'))
        assert 'is active and is in use' in self.machine.execute('cryptsetup status /dev/mapper/luks*')

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
        with b.wait_timeout(45):
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
                "#unlock-device-dialog .pf-v6-c-alert.pf-m-info",
                f"Successfully unlocked {', '.join(successfully_unlocked_devices)}."
            )

        # If the user did not unlock any device after submiting the form expect a warning
        if successfully_unlocked_devices == []:
            fail_text = "Passphrase did not match any locked device"
            b.wait_in_text("#unlock-device-dialog .pf-v6-c-helper-text", fail_text)

    def unlock_all_encrypted(self):
        self.browser.click(f"#{INSTALLATION_METHOD}-unlock-devices-btn")

    def check_disk_encryption_keyboard_layout(self, expected_layout):
        self.browser.wait_val("#disk-encryption-keyboard-layout", expected_layout)

    def check_disk_encryption_vconsole_mismatch_alert(self, present=True):
        """Check if the virtual console mismatch alert is present or not"""
        if present:
            self.browser.wait_visible("#disk-encryption-vconsole-mismatch-alert")
        else:
            self.browser.wait_not_present("#disk-encryption-vconsole-mismatch-alert")


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

    # partitions_params expected structure: [("size", "file system" {, "other mkfs.fs flags"})]
    def create_raid_device(self, name, raid_level, devices):
        self.machine.execute(f"""
        set -ex
        mdadm --create --run {name} --level={raid_level} --raid-devices={len(devices)} {' '.join(devices)}
        udevadm settle
        """, timeout=90)
        self._wait_for_mdraid_clean()
        # Assemble the mdraid device: do this to early detect mdraid regression
        # Remove once: https://bugzilla.redhat.com/show_bug.cgi?id=2385871 is fixed
        self.machine.execute("""
        set -ex
        mdadm --assemble --scan
        udevadm settle
        """, timeout=30)

    def _wait_for_mdraid_clean(self):
        m = self.machine
        m.execute("""
        # Wait for the md array to become active
        udevadm settle
        while [ "$(cat /sys/block/md127/md/array_state)" != "clean" ]; do
            echo "Waiting for RAID array to become active..."
            echo "$(cat /sys/block/md127/md/array_state)"
            sleep 0.5
        done
        """, timeout=30)

    def get_luks_device_name(self, device):
        ret = self.machine.execute(f'cryptsetup luksUUID {device}')
        return f"luks-{ret.strip()}"

    def create_luks_partition(self, device, passphrase, luks_name, fsformat="", close_luks=True):
        self.machine.execute(f"""
        set -ex
        echo {passphrase} | cryptsetup luksFormat {device}
        echo {passphrase} | cryptsetup luksOpen {device} {luks_name}
        # Create a filesystem on the LUKS device
        if [ "{fsformat}" == "xfs" ] || [ "{fsformat}" == "btrfs" ]; then
            mkfs.{fsformat} -f /dev/mapper/{luks_name}
        elif [ "{fsformat}" == "ext4" ]; then
            mkfs.{fsformat} -F /dev/mapper/{luks_name}
        fi

        udevadm settle
        if [ "{close_luks}" == "True" ]; then
            cryptsetup luksClose {luks_name}
        fi
        """)

    def partition_disk(self, disk, partitions_params, is_mbr=False):
        command = "set -x\n"

        command += f"wipefs -a {disk}"

        label = "dos" if is_mbr else "gpt"
        partition_commands = [f'label: {label}']

        for params in partitions_params:
            size = params[0]
            fstype = params[1]

            # Prepare the size string
            size_str = f"size={size}" if size else ""

            if is_mbr:
                # Determine the type code
                type_code = {
                    "efi": "ef",
                    "swap": "82",
                    "lvmpv": "8e",
                    "extended": "extended"
                }.get(fstype, "83")
            else:
                # Determine the GPT type name
                type_code = {
                    "basic-data": "EBD0A0A2-B9E5-4433-87C0-68B6B72699C7",
                    "biosboot": "BIOS boot",
                    "efi": "C12A7328-F81F-11D2-BA4B-00A0C93EC93B",
                    "microsoft-reserved": "E3C9E316-0B5C-4DB8-817D-F92DF00215AE",
                    "microsoft-recovery": "DE94BBA4-06D1-4D40-A16A-BFD50179D6AC",
                }.get(fstype, "Linux filesystem")

            # Build the sfdisk line without redundant commas
            partition_line_elements = []
            if size_str:
                partition_line_elements.append(size_str)
            if type_code:
                partition_line_elements.append(f"type=\"{type_code}\"")
            partition_line = ', '.join(partition_line_elements)
            partition_commands.append(partition_line)

        # Prepare the sfdisk script
        sfdisk_script = '\n'.join(partition_commands)
        command += f"\necho -e '{sfdisk_script}' | sfdisk {disk}"

        # Format the partitions
        partition_number = 1
        logical_partition_number = 5  # Logical partitions start from 5

        for params in partitions_params:
            fstype = params[1]

            # Skip formatting for extended partitions
            if fstype == "extended":
                continue

            # Determine the partition number (logical or primary)
            if fstype == "logical":
                device_number = logical_partition_number
                logical_partition_number += 1
            else:
                device_number = partition_number
                partition_number += 1

            # Construct the device name
            if "nvme" in disk:
                device = f"{disk}p{device_number}"
            else:
                device = f"{disk}{device_number}"

            mkfs_args = f"{" ".join(params[2:] if len(params) > 2 else [])} {device}"

            command += "\nudevadm settle"

            # Format the partition
            if fstype == "swap":
                mkfs = f"mkswap {mkfs_args}"
            elif fstype == "lvmpv":
                mkfs = f"pvcreate {mkfs_args}"
            elif fstype == "efi":
                mkfs = f"mkfs.vfat {mkfs_args}"
            elif fstype == "logical":
                mkfs = f"mkfs.btrfs {mkfs_args}"
            elif fstype in ["biosboot", "microsoft-reserved", "microsoft-recovery", "basic-data"] or fstype is None:
                continue
            else:
                fs = fstype
                mkfs = f"mkfs.{fs} {mkfs_args}"

            command += f"\n{mkfs}"

        # Execute the commands
        self.machine.execute(command)

    def udevadm_settle(self):
        # Workaround to not have any empty mountpoint labels
        self.machine.execute("""
        systemctl restart systemd-udevd
        udevadm trigger
        udevadm settle --timeout=120
        """)

    def get_lsblk_json(self):
        lsblk = self.machine.execute("lsblk -J")
        return json.loads(lsblk)


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

        wait(lambda: self.dbus_get_task_status(task) == "false", tries=20, delay=6)

    def dbus_get_task_status(self, task):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property \
            {STORAGE_SERVICE} \
            {task} \
            org.fedoraproject.Anaconda.Task IsRunning')

        return ret.split('b ')[1].strip().strip('"')

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

    def dbus_set_selected_disk(self, disk):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property \
            {STORAGE_SERVICE} \
            {STORAGE_OBJECT_PATH}/DiskSelection \
            {STORAGE_INTERFACE}.DiskSelection SelectedDisks as 1 {disk}')

    def dbus_reset_scenario(self):
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

    def get_btrfs_volume_ids(self, volume_name):
        """Get device ids of all volumes with volume_name found."""
        # The tool shows unspecified name as "none"
        volume_name = volume_name or "none"
        return [
            f"BTRFS-{uuid.strip()}"
            for uuid in self.machine.execute(
                f"btrfs filesystem show | grep {volume_name} | cut -d ':' -f 3"
            ).split('\n')[:-1]
        ]


class StorageScenario():
    def __init__(self, browser, machine):
        self.machine = machine
        self.browser = browser

    def _scenario_selector(self, scenario):
        return f"#{INSTALLATION_METHOD}-scenario-{scenario}"

    def wait_scenario_visible(self, scenario, visible=True):
        if visible:
            self.browser.wait_visible(self._scenario_selector(scenario))
        else:
            self.browser.wait_not_present(self._scenario_selector(scenario))

    def wait_scenario_available(self, scenario, available=True):
        if available:
            self.browser.wait_visible(f"{self._scenario_selector(scenario)}:not([disabled])")
        else:
            self.browser.wait_visible(f"{self._scenario_selector(scenario)}:disabled")

    @log_step(snapshot_before=True)
    def check_scenario_selected(self, scenario):
        self.browser.wait_visible(f"{self._scenario_selector(scenario)}:checked")

    def check_scenario_index(self, scenario, index):
        self.browser.wait_visible(f".anaconda-screen-method-scenario:nth-child({index}) > {self._scenario_selector(scenario)}")

    @log_step(snapshot_before=True)
    def set_scenario(self, scenario):
        self.browser.click(self._scenario_selector(scenario))
        self.browser.wait_visible(f"{self._scenario_selector(scenario)}:checked")
        self.browser.wait_visible(f"div[data-scenario='{scenario}']")


class StorageReclaimDialog():
    def __init__(self, browser):
        self.browser = browser

    def reclaim_check_device_row(self, location, name=None, deviceType=None, space=None, locked=False):
        self.browser.wait_visible(
            "#reclaim-space-modal-table "
            f"td[data-label=Location]:contains({location}) + " +
            (f"td[data-label=Name]:contains({name}) + " if deviceType != "disk" else "") +
            f"td[data-label=Type]:contains({deviceType}) + "
            f"td[data-label=Space]:contains({space})"
        )
        if locked:
            self.browser.wait_visible(
                f"#reclaim-space-modal-table tr:contains({name}) "
                f"td[data-label=Type] .reclaim-space-modal-device-locked"
            )

    def reclaim_remove_device(self, device):
        self.browser.click(f"#reclaim-space-modal-table tr:contains('{device}') button[aria-label='delete']")

    def reclaim_check_action_button_present(self, device, action, present=True, disabled=False):
        if action == "shrink":
            disabled = ":disabled" if disabled else ":not(:disabled)"
        else:
            disabled = "[aria-disabled='true']" if disabled else ":not([aria-disabled='true'])"
        selector = (
            "#reclaim-space-modal-table "
            f"tr:contains('{device}') "
            f"button[aria-label='{action}']{disabled}"
        )

        if present:
            self.browser.wait_visible(selector)
        else:
            self.browser.wait_not_present(selector)

    def reclaim_modal_submit_and_check_warning(self, warning):
        self.browser.click("button:contains('Reclaim space')")
        self.browser.wait_in_text("#reclaim-space-modal .pf-v6-c-alert", warning)

    def reclaim_shrink_device(self, device, new_size, current_size=None, rowIndex=None, ariaLabel="shrink"):
        self.browser.click(
            "#reclaim-space-modal-table "
            f"tbody{'' if rowIndex is None else f':nth-child({rowIndex})'} "
            f"tr:contains('{device}') button[aria-label='{ariaLabel}']"
        )
        self.browser.wait_visible("#popover-reclaim-space-modal-shrink-body")
        if current_size is not None:
            self.browser.wait_val("#reclaim-space-modal-shrink-input", current_size)
        # HACK: there is some race here which steals the focus from the input and selects the page text instead
        for _ in range(3):
            self.browser.focus('#reclaim-space-modal-shrink-input')
            time.sleep(1)
            if self.browser.eval_js('document.activeElement == document.querySelector("#reclaim-space-modal-shrink-input")'):
                break
        self.browser.set_input_text("#reclaim-space-modal-shrink-input", new_size)
        self.browser.click("#reclaim-space-modal-shrink-button")
        self.browser.wait_not_present("#reclaim-space-modal-shrink-slider")
        self.reclaim_check_action_present(device, ariaLabel, rowIndex=rowIndex)

    def reclaim_check_action_present(self, device, action, present=True, rowIndex=None):
        selector = (
            "#reclaim-space-modal-table "
            f"tbody{'' if rowIndex is None else f':nth-child({rowIndex})'} "
            f"tr:contains('{device}') "
            "td:nth-child(5) "  # Actions column
        )
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

    def reclaim_set_checkbox(self, value):
        self.browser.set_checked("#reclaim-space-checkbox", value)

    def reclaim_modal_submit(self):
        self.browser.click("button.pf-m-warning")
        self.browser.wait_not_present("#reclaim-space-modal")

    def reclaim_modal_cancel(self):
        self.browser.wait_visible("#reclaim-space-modal")
        self.browser.click("#reclaim-space-modal button:contains('Cancel')")
        self.browser.wait_not_present("#reclaim-space-modal")


class StorageMountPointMapping(StorageDBus, StorageDestination):
    def __init__(self, browser, machine):
        self.browser = browser
        self.machine = machine

        StorageDBus.__init__(self, machine)
        StorageDestination.__init__(self, browser, machine)

    def table_row(self, row):
        return f"#{CUSTOM_MOUNT_POINT}-table-row-{row}"

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

        self.browser.click(f"#{INSTALLATION_METHOD}-change-destination-button")

        for (disk, selected) in disks:
            self.browser.set_checked(f"#{INSTALLATION_METHOD}-disk-selection-menu-item-{disk} input[type=checkbox]", selected)

        self.browser.click(f"#{INSTALLATION_METHOD}-change-destination-modal button:contains('Select')")
        for (disk, selected) in disks:
            self.check_disk_selected(disk, selected)

    def select_mountpoint(self, disks=None):
        if disks is not None:
            self.select_disks(disks)

        self.set_scenario("mount-point-mapping")

        self.browser.click("button:contains(Next)")
        self.browser.wait_js_cond(f'window.location.hash === "#/{CUSTOM_MOUNT_POINT}"')

        with self.browser.wait_timeout(30):
            self.browser.wait_visible(f"#{CUSTOM_MOUNT_POINT}-table")

    def select_mountpoint_row_mountpoint(self, row, mountpoint):
        self.browser.set_input_text(f"{self.table_row(row)} td[data-label='Mount point'] input", mountpoint)

    def select_mountpoint_row_device(self, row, device, device_id=None):
        toggle_selector = f"{self.table_row(row)}-device-select-toggle:not([disabled]):not([aria-disabled=true])"
        self.browser.click(toggle_selector)

        if device_id:
            item_selector = f".pf-v6-c-menu li[data-device-id='{device_id}']"
        else:
            item_selector = f".pf-v6-c-menu li[data-device-name='{device}']"

        self.browser.click(item_selector)
        self.browser.wait_not_present(".pf-v6-c-menu")
        self.browser.wait_in_text(f"{self.table_row(row)} .pf-v6-c-select__toggle-text", device)

    def toggle_mountpoint_row_device(self, row):
        self.browser.click(f"{self.table_row(row)}-device-select-toggle")

    def check_mountpoint_row_device(self, row, device):
        self.browser.wait_text(f"{self.table_row(row)} .pf-v6-c-select__toggle-text", device)

    def check_mountpoint_row_mountpoint(self, row, mountpoint, constrained=True):
        if constrained:
            self.browser.wait_text(f"{self.table_row(row)}-mountpoint", mountpoint)
        else:
            self.browser.wait_val(f"{self.table_row(row)}-mountpoint", mountpoint)

    def check_mountpoint_row_format_type(self, row, format_type):
        self.toggle_mountpoint_row_device(row)
        self.browser.wait_in_text(".pf-v6-c-menu__item.pf-m-selected", format_type)
        self.toggle_mountpoint_row_device(row)

    def check_mountpoint_row_device_available(self, row, device, available=True, disabled=False):
        disabled_selector = "[aria-disabled='true']" if disabled else ":not([aria-disabled='true'])"

        self.toggle_mountpoint_row_device(row)
        item_selector = f".pf-v6-c-menu li[data-device-name='{device}'] button{disabled_selector}"

        if available:
            self.browser.wait_visible(item_selector)
        else:
            self.browser.wait_not_present(f".pf-v6-c-menu li[data-device-name='{device}']")

        self.toggle_mountpoint_row_device(row)

    def select_mountpoint_row_reformat(self, row, selected=True):
        self.browser.set_checked(f"{self.table_row(row)} td[data-label='Reformat'] input", selected)

    def remove_mountpoint_row(self, row, initial_count):
        self.browser.wait_js_cond(f"ph_count('#{CUSTOM_MOUNT_POINT}-table tbody tr') == {initial_count}")
        self.browser.click(f"{self.table_row(row)} button[aria-label='Remove']")
        self.browser.wait_js_cond(f"ph_count('#{CUSTOM_MOUNT_POINT}-table tbody tr') == {initial_count - 1}")

    def check_mountpoint_row_reformat(self, row, checked):
        checked_selector = "input:checked" if checked else "input:not(:checked)"
        self.browser.wait_visible(f"{self.table_row(row)} td[data-label='Reformat'] {checked_selector}")

    def add_mountpoint_row(self):
        rows = self.browser.call_js_func("ph_count", f'#{CUSTOM_MOUNT_POINT}-table tbody tr')
        self.browser.click("button:contains('Add mount')")
        self.browser.wait_js_cond(f"ph_count('#{CUSTOM_MOUNT_POINT}-table tbody tr') == {rows + 1}")

    def wait_mountpoint_table_column_helper(self, row, column, text=None, present=True):
        if present:
            self.browser.wait_in_text(f"#{CUSTOM_MOUNT_POINT}-table-row-{row}-{column} .pf-v6-c-helper-text__item.pf-m-error", text)
        else:
            self.browser.wait_not_present(f"#{CUSTOM_MOUNT_POINT}-table-row-{row}-{column} .pf-v6-c-helper-text__item.pf-m-error")


class Storage(StorageEncryption, StorageMountPointMapping, StorageScenario, StorageReclaimDialog, StorageUtils):
    def __init__(self, browser, machine):
        StorageEncryption.__init__(self, browser, machine)
        StorageMountPointMapping.__init__(self, browser, machine)
        StorageScenario.__init__(self, browser, machine)
        StorageReclaimDialog.__init__(self, browser)
        StorageUtils.__init__(self, browser, machine)
