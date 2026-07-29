# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Helpers for mocking the python-bugzilla package in integration tests."""

import json
from pathlib import Path

MOCK_BUGS_PATH = "/tmp/anaconda-bugzilla-mock-bugs.json"

MOCK_SCRIPTS_DIR = Path(__file__).parent.parent / "mock_bugzilla_scripts"


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
    mock_bugzilla_init = (MOCK_SCRIPTS_DIR / "bugzilla_init.py").read_text()
    machine.write(f"{site}/bugzilla/__init__.py", mock_bugzilla_init)


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
