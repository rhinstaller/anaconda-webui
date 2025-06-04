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
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from password import Password
from step_logger import log_step
from steps import ACCOUNTS

USERS_SERVICE = "org.fedoraproject.Anaconda.Modules.Users"
USERS_INTERFACE = USERS_SERVICE
USERS_OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Users"

ACCOUNTS_SCREEN = ACCOUNTS
CREATE_ACCOUNT_ID_PREFIX = f"{ACCOUNTS_SCREEN}-create-account"
ROOT_ACCOUNT_ID_PREFIX = f"{ACCOUNTS_SCREEN}-root-account"


class UsersDBus():
    def __init__(self, machine):
        self.machine = machine
        self._bus_address = self.machine.execute("cat /run/anaconda/bus.address")

    def dbus_get_users(self):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property  \
            {USERS_SERVICE} \
            {USERS_OBJECT_PATH} \
            {USERS_INTERFACE} Users')

        return ret

    def dbus_clear_users(self):
        self.machine.execute(f'busctl --address="{self._bus_address}" \
            set-property  \
            {USERS_SERVICE} \
            {USERS_OBJECT_PATH} \
            {USERS_INTERFACE} Users aa{{sv}} 0')

    def dbus_get_root_locked(self):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property  \
            {USERS_SERVICE} \
            {USERS_OBJECT_PATH} \
            {USERS_INTERFACE} IsRootAccountLocked')

        return ret.split()[1].strip() == "true"

    def dbus_get_is_root_password_set(self):
        ret = self.machine.execute(f'busctl --address="{self._bus_address}" \
            get-property  \
            {USERS_SERVICE} \
            {USERS_OBJECT_PATH} \
            {USERS_INTERFACE} IsRootPasswordSet')

        return ret.split()[1].strip() == "true"


class Users(UsersDBus):
    def __init__(self, browser, machine):
        self.browser = browser

        UsersDBus.__init__(self, machine)

    @log_step(snapshot_before=True)
    def set_user_name(self, user_name, append=False, value_check=True):
        sel = f"#{ACCOUNTS_SCREEN}-create-account-user-name"
        self.browser.set_input_text(sel, user_name, append=append, value_check=value_check)

    @log_step(snapshot_before=True)
    def check_user_name(self, user_name):
        sel = f"#{ACCOUNTS_SCREEN}-create-account-user-name"
        self.browser.wait_val(sel, user_name)

    @log_step(snapshot_before=True)
    def set_full_name(self, full_name, append=False, value_check=True):
        sel = f"#{ACCOUNTS_SCREEN}-create-account-full-name"
        self.browser.set_input_text(sel, full_name, append=append, value_check=value_check)

    @log_step(snapshot_before=True)
    def check_full_name(self, full_name):
        sel = f"#{ACCOUNTS_SCREEN}-create-account-full-name"
        self.browser.wait_val(sel, full_name)

    @log_step(snapshot_before=True)
    def enable_root_account(self, enable):
        sel = f"#{ACCOUNTS_SCREEN}-root-account-enable-root-account"
        self.browser.set_checked(sel, enable)

    def set_valid_root_password(self, valid=True):
        p = Password(self.browser, ROOT_ACCOUNT_ID_PREFIX)
        password = "password"
        p.set_password(password)
        p.set_password_confirm(password if valid else "X")


def create_user(browser, machine):
    p = Password(browser, CREATE_ACCOUNT_ID_PREFIX)
    u = Users(browser, machine)

    password = "password"
    p.set_password(password)
    p.set_password_confirm(password)
    u.set_user_name("tester")
