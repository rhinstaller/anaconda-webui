# Copyright (C) 2026 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from step_logger import log_step
from steps import INSTALLATION_SOURCE

SCREEN = INSTALLATION_SOURCE

CLOSEST_MIRROR = "closest-mirror"


def repo_url_path(machine):
    """Path of the HTTP test repo as shown in the URL field, without the scheme.

    Derived from the same helper that builds the ``repo`` line in
    interactive-defaults.ks, so the two can not drift apart.
    """
    return f"10.0.2.2:{machine.http_install_port}/{machine._payload_http_relpath('repo')}/"


class InstallationSource:
    def __init__(self, browser):
        self.browser = browser

    @log_step()
    def wait_visible(self):
        self.browser.wait_visible(f"#{SCREEN}")

    @log_step()
    def select_protocol(self, value):
        self.browser.select_from_dropdown(f"#{SCREEN}-protocol", value)

    @log_step()
    def select_url_type(self, value):
        self.browser.select_from_dropdown(f"#{SCREEN}-url-type", value)

    @log_step()
    def set_url_path(self, path):
        self.browser.set_input_text(f"#{SCREEN}-url", path, append=False)

    @log_step()
    def check_protocol(self, value):
        self.browser.wait_val(f"#{SCREEN}-protocol", value)

    @log_step()
    def check_url_path(self, path):
        self.browser.wait_val(f"#{SCREEN}-url", path)

    @log_step()
    def check_url_type(self, value):
        self.browser.wait_val(f"#{SCREEN}-url-type", value)

    @log_step()
    def check_url_input_disabled(self, disabled=True):
        sel = f"#{SCREEN}-url"
        if disabled:
            self.browser.wait_visible(f"{sel}[disabled]")
        else:
            self.browser.wait_visible(f"{sel}:not([disabled])")

    @log_step()
    def set_http_repo(self, machine, url_type="BASEURL"):
        """Fill in the HTTP test repo. Does not apply it, Next does that."""
        self.select_protocol("http")
        self.set_url_path(repo_url_path(machine))
        self.select_url_type(url_type)

    @log_step()
    def restore_default_source(self, installer):
        """Put the source back to the closest mirror the installer booted with.

        The HTTP test repo carries no comps environments, so a test that leaves
        it configured would break every later test in a nondestructive class.
        """
        installer.reach_on_sidebar(installer.steps.INSTALLATION_SOURCE)
        self.select_protocol(CLOSEST_MIRROR)
        installer.next()
