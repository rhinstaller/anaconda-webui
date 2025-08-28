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

import os


def add_public_key(machine):
    with open(f'{machine.identity_file}.pub', 'r') as pub:
        public_key = pub.read()

    sysroot_ssh = '/mnt/sysroot/root/.ssh'
    authorized_keys = os.path.join(sysroot_ssh, 'authorized_keys')
    machine.execute(f"chmod 700 {sysroot_ssh}")
    machine.write(authorized_keys, public_key, perm="0600")


def pretend_live_workstation_iso(test, installer, machine):
    hidden_screens = machine.execute("cat /etc/anaconda/profile.d/fedora-workstation.conf  | grep anaconda-screen").split('\n')
    hidden_screens = [x.strip() for x in hidden_screens]

    installer.steps.hidden_steps.extend(hidden_screens)

    test.restore_file('/run/anaconda/anaconda.conf')
    test.machine.execute("sed -i 's/type = BOOT_ISO/type = LIVE_OS/g' /run/anaconda/anaconda.conf")
    test.machine.execute(f"sed -i '/[anaconda]/a hidden_webui_pages = {" ".join(hidden_screens)}' /run/anaconda/anaconda.conf")

def pretend_default_scheme(test, scheme):
    test.restore_file('/run/anaconda/anaconda.conf')
    test.machine.execute(f"sed -i 's/default_scheme =.*/default_scheme = {scheme}/g' /run/anaconda/anaconda.conf")

def get_pretty_name(machine):
    return machine.execute("cat /etc/os-release | grep PRETTY_NAME | cut -d '\"' -f 2 | tr -d '\n'")

def rsync_directory(machine, source_mountpoint, target_mountpoint, retry=True):
    try:
        machine.execute(f"""
            set -xe
            rsync -pogAXtlHrDx \
                --exclude=/dev/* \
                --exclude=/proc/* \
                --exclude=/sys/* \
                --exclude=/tmp/* \
                --exclude=/run/* \
                --exclude=/mnt/* \
                --exclude=/media/* \
                --exclude=/lost+found \
                --exclude=/var/lib/machines \
                --exclude=/var \
                {source_mountpoint}/* {target_mountpoint}
        """)
    except RuntimeError as e:
        if retry:
            rsync_directory(machine, source_mountpoint, target_mountpoint, retry=False)
        else:
            raise RuntimeError(f"Error during rsync: {e}") from e


def move_standard_fedora_disk_to_disk(machine, src_disk, dst_disk,
                                      dst_root_part_num, dst_boot_part_num,
                                      dst_efi_part_num=None):
    """
    Move Fedora installation from a disk to another disk.

    Copy content of / and /boot, create /etc/fstab.
    """
    machine.execute(f"""
    set -xe

    # Create btrfs layout
    mkfs.btrfs -f -L BTRFS /dev/{dst_disk}{dst_root_part_num}
    mount /dev/{dst_disk}{dst_root_part_num} /mnt
    btrfs subvolume create /mnt/root
    btrfs subvolume create /mnt/home

    # Copy data from the first disk / to the new disk
    mkdir -p /mnt-fedora
    mount /dev/{src_disk}4 /mnt-fedora
    """)

    rsync_directory(machine, "/mnt-fedora", "/mnt")

    efi_fstab_record = ""
    if dst_efi_part_num:
        efi_fstab_record = (
            f"echo \"UUID=$(blkid -s UUID -o value /dev/{dst_disk}{dst_efi_part_num}) "
            f"/boot/efi vfat umask=0077,shortname=winnt 0 2\" >> /mnt/root/etc/fstab"
        )

    machine.execute(f"""
    # Adjust /etc/fstab to contain the new device UUIDS
    echo "UUID=$(blkid -s UUID -o value /dev/{dst_disk}{dst_root_part_num}) / btrfs defaults,subvol=root 0 0" > /mnt/root/etc/fstab
    echo "UUID=$(blkid -s UUID -o value /dev/{dst_disk}{dst_root_part_num}) /home btrfs defaults,subvol=home 0 0" >> /mnt/root/etc/fstab
    echo "UUID=$(blkid -s UUID -o value /dev/{dst_disk}{dst_boot_part_num}) /boot ext4 defaults 0 0" >> /mnt/root/etc/fstab
    {efi_fstab_record}

    umount -l /mnt-fedora
    umount -l /mnt

    # Do the same for /boot
    mount /dev/{dst_disk}{dst_boot_part_num} /mnt
    mount /dev/{src_disk}3 /mnt-fedora
    rsync -aAXHv /mnt-fedora/ /mnt/

    umount -l /mnt-fedora
    umount -l /mnt
    """, timeout=90)


def move_standard_fedora_disk_to_MBR_disk(storage, machine, mbr_disk, fedora_disk):
    """Partition a disk with msdos table and copy Fedora system from another disk on it."""
    storage.partition_disk(f"/dev/{mbr_disk}", [
        ("1GiB", "ext4"),
        ("13GiB", "btrfs"),
    ], is_mbr=True)
    boot_part = 1
    root_part = 2
    move_standard_fedora_disk_to_disk(machine, fedora_disk, mbr_disk, root_part, boot_part)


def move_standard_fedora_disk_to_win_disk(storage, machine, win_disk, fedora_disk):
    """Partition a disk with Win + Fedora layout and copy Fedora system from another disk on it."""
    # Windows + Fedora partitioning
    storage.partition_disk(f"/dev/{win_disk}", [
        # Common
        ("100MiB", "efi"),
        # Windows
        ("128MiB", "microsoft-reserved"),
        ("11.5GiB", "basic-data"),
        # Fedora
        ("1GiB", "ext4"),
        ("13GiB", "btrfs"),
        # Windows
        ("530MiB", "microsoft-recovery"),
    ])
    boot_part = 4
    root_part = 5
    uefi_part = 1
    move_standard_fedora_disk_to_disk(machine, fedora_disk, win_disk, root_part, boot_part,
                                      dst_efi_part_num=uefi_part)
