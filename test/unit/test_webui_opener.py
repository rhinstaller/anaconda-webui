#!/usr/bin/python3
# Copyright (C) 2026 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Exercise the Firefox opener contract without a graphical session."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from textwrap import dedent

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPT = ROOT_DIR / "src/scripts/anaconda-webui-opener-firefox"
URL = "http://127.0.0.1/installer?one=two&label=with space#fragment"


class TestWebuiOpener(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.directory = Path(tmp.name)
        self.env = os.environ.copy()
        self.env.pop("ANACONDA_WEBUI_MODE", None)
        self.env.update(
            PATH=f"{self.directory}:{os.environ['PATH']}",
            XDG_RUNTIME_DIR=str(self.directory / "runtime with spaces"),
            OPENER_TEST_THEMES=str(ROOT_DIR / "firefox-theme"),
        )
        self.profile = Path(self.env["XDG_RUNTIME_DIR"]) / "anaconda/firefox-profile"
        # Redirect only the installed data lookup to the source-tree fixtures.
        self.write_command("cp", """
            exec /usr/bin/cp "$1" "$OPENER_TEST_THEMES/${2#/usr/share/anaconda/firefox-theme/}" "$3"
        """)
        self.write_command("firefox", """
            printf '%s\\n' "$@"
            exit "$OPENER_TEST_STATUS"
        """)

    def write_command(self, name, body):
        command = self.directory / name
        command.write_text("#!/bin/sh\n" + dedent(body), encoding="utf-8")
        command.chmod(0o755)

    def run_opener(self, *, mode=None, status=0):
        env = dict(self.env, OPENER_TEST_STATUS=str(status))
        if mode is not None:
            env["ANACONDA_WEBUI_MODE"] = mode
        return subprocess.run(["bash", str(SCRIPT), URL], env=env,
                              capture_output=True, text=True, check=False, timeout=10)

    def test_profile_and_url(self):
        for mode in (None, "live"):
            with self.subTest(mode=mode):
                result = self.run_opener(mode=mode)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.splitlines(), ["--new-instance", "--profile", str(self.profile), URL])
                theme = ROOT_DIR / "firefox-theme" / (mode or "default") / "user.js"
                self.assertEqual((self.profile / "user.js").read_bytes(), theme.read_bytes())

    def test_browser_exit_status(self):
        result = self.run_opener(status=42)
        self.assertEqual(result.returncode, 42, result.stderr)


if __name__ == "__main__":
    unittest.main()
