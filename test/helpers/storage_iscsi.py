# Copyright (C) 2026 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import sys

from testlib import wait  # pylint: disable=import-error

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

INITIATOR_FILE = "/etc/iscsi/initiatorname.iscsi"

# Addresses of the machines provisioned for an iSCSI test
INSTALLER_IP = "10.111.113.1"
ISCSI_SERVER_IP = "10.111.113.2"
DNS_IP = "10.111.112.100"

def iscsi_provision(image="fedora-rawhide", memory_mb=1024, **server_options):
    """Machines required by an iSCSI test

    The installer machine gets an additional interface on the network shared by
    the machines of the test so that it can reach the iSCSI server machine.
    """
    return {
        "0": {"address": f"{INSTALLER_IP}/20", "dns": DNS_IP, "mcast_network": True},
        "iscsi-server": {
            "address": f"{ISCSI_SERVER_IP}/20", "dns": DNS_IP,
            "image": image, "memory_mb": memory_mb,
            "inherit_machine_class": False, **server_options
        }
    }


class StorageISCSIHelpers():
    def __init__(
            self,
            server=None,
            client=None,
            target_ip=ISCSI_SERVER_IP,
            target_iqn="iqn.2015-09.cockpit.lan",
            initiator_iqn="iqn.2015-10.cockpit.lan"
    ):
        self.server = server
        self.client = client
        self.target_ip = target_ip
        self.target_iqn = target_iqn
        self.initiator_iqn = initiator_iqn
        self.user_name = "admin"
        self.discovery_password = "foobar"
        self.auth_password = "barfoo"

    def setup_iscsi_server(self, size="50M"):
        if not self.server:
            self.client.execute(f"echo Using external iSCSI server {self.target_ip}")
            return
        # Setup a iSCSI target with authentication for discovery
        self.server.execute("""
                  export TERM=dumb
                  targetcli /backstores/ramdisk create test %(size)s
                  targetcli /iscsi set discovery_auth enable=1 userid=admin password=%(discovery_password)s
                  targetcli /iscsi create %(tgt)s
                  targetcli /iscsi/%(tgt)s/tpg1/luns create /backstores/ramdisk/test
                  targetcli /iscsi/%(tgt)s/tpg1 set attribute authentication=1
                  targetcli /iscsi/%(tgt)s/tpg1/acls create %(ini)s
                  targetcli /iscsi/%(tgt)s/tpg1/acls/%(ini)s set auth userid=admin password=%(auth_password)s
                  """ % {
                      "tgt": self.target_iqn,
                      "ini": self.initiator_iqn,
                      "discovery_password": self.discovery_password,
                      "auth_password": self.auth_password,
                      "size": size
                    })
        self.server.execute("""
                  firewall-cmd --add-port=3260/tcp --permanent
                  systemctl reload firewalld""")

    def get_device_node(self):
        """Return the kernel device node (eg. 'sda') of the attached iSCSI disk

        The device shows up asynchronously after the iSCSI login and its name
        depends on the probing order, so it has to be looked up at runtime.
        """
        def find_device():
            out = self.client.execute("lsblk --scsi --noheadings --output NAME,VENDOR")
            for line in out.splitlines():
                fields = line.split()
                if len(fields) >= 2 and fields[1] == "LIO-ORG":
                    return fields[0]
            return None

        return wait(find_device, msg="Waiting for the iSCSI disk to appear")

    def attach_disk(self, test_case, storage,
                    initiator_iqn, target_iqn,
                    user_name, discovery_password, auth_password):
        storage.enter_cockpit_storage()
        tc = test_case

        tc.click_devices_dropdown("Change iSCSI initiator name")
        tc.dialog({"name": initiator_iqn})

        tc.click_devices_dropdown("Add iSCSI portal")
        tc.dialog_wait_open()
        tc.dialog_set_vals({"address": self.target_ip,
                            "username": user_name,
                            "password": discovery_password})
        tc.dialog_apply()

        # The dialog closes and a new dialog opens but we can't get
        # between that, so we just wait for the new fields to
        # appear.
        tc.browser.wait_visible(tc.dialog_field("target"))
        tc.browser.wait_in_text(tc.dialog_field("target"), target_iqn)
        tc.dialog_apply()

        # Login will fail and a new dialog opens
        tc.browser.wait_visible(tc.dialog_field("username"))
        tc.dialog_wait_val("username", user_name)
        tc.dialog_wait_val("password", discovery_password)
        tc.dialog_set_val("password", auth_password)
        tc.dialog_apply()
        tc.dialog_wait_close()

        storage.exit_cockpit_storage()

    # TODO: maybe unify with cockpitCreateBootloaderPartitions
    def cockpit_create_localdisk_partitions(self, test_case, local_disk):
        tc = test_case

        tc.click_dropdown(tc.card_row("Storage", name="vda"), "Create partition table")
        tc.dialog({"type": "gpt"})

        tc.click_card_row("Storage", name="vda")
        tc.click_dropdown(tc.card_row("GPT partitions", 1), "Create partition")
        tc.dialog({"size": 524, "type": "efi", "mount_point": "/boot/efi"})
        tc.click_dropdown(tc.card_row("GPT partitions", 2), "Create partition")
        tc.dialog({"size": 1070, "type": "ext4", "mount_point": "/boot"})
        tc.click_dropdown(tc.card_row("GPT partitions", 3), "Create partition")
        tc.dialog({"type": "xfs", "mount_point": "/"})

        tc.browser.click(tc.card_parent_link())

    def create_data_partition(self, test_case, device, mount_point="/data", fs_type="xfs"):
        """Create a partition with the given mount point on the iSCSI disk

        Expects to be in the Cockpit storage iframe on the overview page and
        returns back to it.
        """
        tc = test_case

        tc.click_dropdown(tc.card_row("Storage", name=device), "Create partition table")
        tc.dialog({"type": "gpt"})

        # Do the partitioning on the page of the disk itself, the row indexes in
        # the overview depend on the number of the devices and their names.
        tc.click_card_row("Storage", name=device)
        tc.click_dropdown(tc.card_row("GPT partitions", 1), "Create partition")
        # Creating the filesystem on the network attached device takes longer
        with tc.browser.wait_timeout(120):
            tc.dialog({"type": fs_type, "mount_point": mount_point})

        # Return to the overview
        tc.browser.click(tc.card_parent_link())
        tc.browser.click(tc.card_parent_link())

    def write_initiator_config(self, root="/mnt/sysroot"):
        """Copy the iSCSI configuration of the installer to the installed system

        This is what blivet's iscsi.write() does at the end of the installation.
        It is skipped for a disk attached outside of blivet (in Cockpit storage),
        so the installed system would not know about the node and could not
        connect to the target on boot.
        """
        self.client.execute(f"""set -eu
            if [ -d /var/lib/iscsi ]; then
                rm -rf {root}/var/lib/iscsi
                cp -a /var/lib/iscsi {root}/var/lib/iscsi
            fi
            mkdir -p -m 0755 {root}/etc/iscsi
            cp -a {INITIATOR_FILE} {root}{INITIATOR_FILE}
            # 'cp -a' copies the SELinux labels too and /var/lib/iscsi of the
            # installer runtime is labeled 'mock_var_lib_t' (the runtime image is
            # built in mock). iscsid is not allowed to read the node database
            # with such a label ("iscsiadm: No records found" on boot), so
            # relabel the copied files according to the installed system.
            chroot {root} restorecon -R /etc/iscsi /var/lib/iscsi""")
