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
    with open(machine.identity_file + '.pub', 'r') as pub:
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
