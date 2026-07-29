# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Helpers for mocking the python-bugzilla package in integration tests."""

import json

MOCK_BUGS_PATH = "/tmp/anaconda-bugzilla-mock-bugs.json"

# Mock python-bugzilla package used by the Bugzilla helper scripts.
# Bugs are read from MOCK_BUGS_PATH so each test can configure results.
MOCK_BUGZILLA_INIT = f'''
import json
import os
from xmlrpc.client import Fault

MOCK_BUGS_PATH = "{MOCK_BUGS_PATH}"


class Bug:
    def __init__(self, id, summary, status):
        self.id = id
        self.summary = summary
        self.status = status


class Bugzilla:
    def __init__(self, url, api_key=None):
        self.url = url
        self.api_key = api_key

    @property
    def logged_in(self):
        if not self.api_key or self.api_key == "invalid-api-key":
            raise Fault(300, "The API key you specified is invalid")
        return True

    def build_query(self, **kwargs):
        return kwargs

    def query(self, query):
        if not os.path.exists(MOCK_BUGS_PATH):
            return []
        with open(MOCK_BUGS_PATH, encoding="utf-8") as handle:
            data = json.load(handle)
        return [Bug(item["id"], item["summary"], item["status"]) for item in data]

    def createbug(self, **kwargs):
        class NewBug:
            id = 999999
        return NewBug()

    def attachfile(self, *args, **kwargs):
        return 1
'''


def _python_cmd(machine):
    return machine.execute(
        "command -v /usr/libexec/platform-python || command -v python3"
    ).strip()


def _site_packages(machine):
    py = _python_cmd(machine)
    return machine.execute(
        f"{py} -c 'import sysconfig; print(sysconfig.get_paths()[\"purelib\"])'"
    ).strip()


def install_mock_bugzilla(machine, bugs=None):
    """Install a mock bugzilla package and optional canned search results.

    :param machine: test machine
    :param bugs: list of dicts with id/summary/status, or empty list for no matches
    """
    if bugs is None:
        bugs = []

    machine.write(MOCK_BUGS_PATH, json.dumps(bugs))

    site = _site_packages(machine)
    machine.execute(f"""
set -eu
SITE="{site}"
if [ -e "$SITE/bugzilla" ] && [ ! -e "$SITE/bugzilla.anaconda-test-bak" ]; then
    mv "$SITE/bugzilla" "$SITE/bugzilla.anaconda-test-bak"
fi
if [ -e "$SITE/bugzilla.py" ] && [ ! -e "$SITE/bugzilla.py.anaconda-test-bak" ]; then
    mv "$SITE/bugzilla.py" "$SITE/bugzilla.py.anaconda-test-bak"
fi
mkdir -p "$SITE/bugzilla"
""")
    machine.write(f"{site}/bugzilla/__init__.py", MOCK_BUGZILLA_INIT)


def set_mock_bugzilla_bugs(machine, bugs):
    """Update canned search results for an already installed mock."""
    machine.write(MOCK_BUGS_PATH, json.dumps(bugs))


def uninstall_mock_bugzilla(machine):
    """Restore the original bugzilla package if it was backed up."""
    site = _site_packages(machine)
    machine.execute(f"""
set -eu
SITE="{site}"
rm -rf "$SITE/bugzilla"
if [ -e "$SITE/bugzilla.anaconda-test-bak" ]; then
    mv "$SITE/bugzilla.anaconda-test-bak" "$SITE/bugzilla"
fi
if [ -e "$SITE/bugzilla.py.anaconda-test-bak" ]; then
    mv "$SITE/bugzilla.py.anaconda-test-bak" "$SITE/bugzilla.py"
fi
rm -f "{MOCK_BUGS_PATH}"
""")
