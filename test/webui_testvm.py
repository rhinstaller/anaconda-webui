#!/usr/bin/python3 -u
#
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

import signal
import subprocess
import argparse

from machine_install import VirtInstallMachine, VirtInstallEFIMachine


def cmd_cli():
    parser = argparse.ArgumentParser(description="Run a VM image until SIGTERM or SIGINT")
    parser.add_argument("image", help="Image name")
    parser.add_argument("--rsync", help="Rsync development files over on startup", action='store_true')
    parser.add_argument("--host", help="Hostname to rsync", default='test-updates')
    parser.add_argument("--efi", help="Start the VM with an EFI firmware", action='store_true')
    args = parser.parse_args()

    if args.efi:
        machine = VirtInstallEFIMachine(image=args.image)
    else:
        machine = VirtInstallMachine(image=args.image)
    try:
        machine.start()

        live_os = machine.is_live()
        if not live_os:
            print("You can connect to the VM in the following ways:")
            # print ssh command
            print("ssh -o ControlPath=%s -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -p %s %s@%s" %
                  (machine.ssh_master, machine.ssh_port, machine.ssh_user, machine.ssh_address))
            # print Cockpit web address
            print(
                "http://%s:%s/cockpit/@localhost/anaconda-webui/index.html" %
                (machine.web_address, machine.web_port)
            )

            # rsync development files over so /usr/local/share/cockpit is created with a development version
            if args.rsync:
                # Rather annoying the node_modules path needs to be explicitly added for webpack
                subprocess.check_call(["npm", "run", "build"], env={'RSYNC': args.host, "PATH": "/usr/bin/:node_modules/.bin", "LINT": "0"})
        else:
            print("You can start the installer by running the following command on the terminal in the test VM:")
            print("liveinst --graphical --updates=http://10.0.2.2:%s/updates.img" % (machine.http_updates_img_port))

        # print marker that the VM is ready; tests can poll for this to wait for the VM
        print("RUNNING")

        signal.signal(signal.SIGTERM, lambda sig, frame: machine.stop())
        signal.pause()
    except KeyboardInterrupt:
        machine.stop()


# This can be used as helper program for tests not written in Python: Run given
# image name until SIGTERM or SIGINT; the iso must exist in test/images/;
# $ webui_testvm.py fedora-rawhide-boot
if __name__ == "__main__":
    cmd_cli()
