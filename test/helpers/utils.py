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


def pretend_live_iso(test, installer, machine):
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

def move_standard_fedora_disk_to_MBR_disk(storage, machine, mbr_disk, new_disk):
    disk = mbr_disk
    dev = mbr_disk.split("/")[-1]
    dev_fedora = new_disk
    storage.partition_disk(disk, [("1GiB", "ext4"), ("13GiB", "btrfs")], is_mbr=True)

    # Create standard btrfs layout in the empty disk and copy the data from the fedora
    # disk to emulate the installation on MBR disk.
    # Then eject the fedora disk
    machine.execute(f"""
    set -xe

    # Create btrfs layout
    mkfs.btrfs -f -L BTRFS {disk}2
    mount {disk}2 /mnt
    btrfs subvolume create /mnt/root
    btrfs subvolume create /mnt/home

    # Copy data from the first disk / to the new disk
    mkdir -p /mnt-fedora
    mount /dev/{dev_fedora}4 /mnt-fedora
    """)

    rsync_directory(machine, "/mnt-fedora", "/mnt")

    machine.execute(f"""
    # Adjust /etc/fstab to contain the new device UUIDS
    echo "UUID=$(blkid -s UUID -o value /dev/{dev}2) / btrfs defaults,subvol=root 0 0" > /mnt/root/etc/fstab
    echo "UUID=$(blkid -s UUID -o value /dev/{dev}2) /home btrfs defaults,subvol=home 0 0" >> /mnt/root/etc/fstab
    echo "UUID=$(blkid -s UUID -o value /dev/{dev}1) /boot ext4 defaults 0 0" >> /mnt/root/etc/fstab

    umount -l /mnt-fedora
    umount -l /mnt

    # Do the same for /boot
    mount /dev/{dev}1 /mnt
    mount /dev/{dev_fedora}3 /mnt-fedora
    rsync -aAXHv /mnt-fedora/ /mnt/

    umount -l /mnt-fedora
    umount -l /mnt
    """, timeout=90)
