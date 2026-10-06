#!/usr/bin/python3
#
# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Unit tests for src/scripts/search-bugzilla-bugs.py"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from textwrap import dedent

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPT = ROOT_DIR / "src" / "scripts" / "search-bugzilla-bugs.py"


class TestSearchBugzillaBugs(unittest.TestCase):
    def _run_script(self, payload, mock_module_dir):
        env = os.environ.copy()
        env["PYTHONPATH"] = mock_module_dir + os.pathsep + env.get("PYTHONPATH", "")
        return subprocess.run(
            [sys.executable, str(SCRIPT)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            check=False,
            env=env,
        )

    def _write_mock_bugzilla(self, directory, bugs=None, raise_on_query=False):
        bugs = bugs or []
        bug_literals = ", ".join(
            f"MockBug({bug['id']!r}, {bug['summary']!r}, {bug['status']!r})"
            for bug in bugs
        )
        query_body = (
            "raise RuntimeError('query failed')"
            if raise_on_query
            else f"return [{bug_literals}]"
        )
        (Path(directory) / "bugzilla.py").write_text(
            dedent(
                f"""
                class MockBug:
                    def __init__(self, id, summary, status):
                        self.id = id
                        self.summary = summary
                        self.status = status

                class Bugzilla:
                    def __init__(self, url, api_key=None):
                        self.url = url
                        self.api_key = api_key

                    def build_query(self, **kwargs):
                        return kwargs

                    def query(self, query):
                        {query_body}
                """
            ),
            encoding="utf-8",
        )

    def test_returns_matching_bugs(self):
        with tempfile.TemporaryDirectory() as tmp:
            bugs = [
                {"id": 111, "summary": "Storage failed", "status": "NEW"},
                {"id": 222, "summary": "Network failed", "status": "ASSIGNED"},
            ]
            self._write_mock_bugzilla(tmp, bugs)
            result = self._run_script(
                {
                    "api_key": "key",
                    "product": "Fedora",
                    "summary": "Storage failed",
                    "component": "anaconda-webui",
                    "limit": 5,
                },
                tmp,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(len(data["bugs"]), 2)
            self.assertEqual(data["bugs"][0]["id"], 111)
            self.assertEqual(data["bugs"][0]["status"], "NEW")
            self.assertEqual(
                data["bugs"][0]["url"],
                "https://bugzilla.redhat.com/show_bug.cgi?id=111",
            )
            self.assertEqual(data["bugs"][1]["id"], 222)

    def test_returns_empty_list_when_no_matches(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write_mock_bugzilla(tmp, [])
            result = self._run_script(
                {
                    "api_key": "key",
                    "product": "Fedora",
                    "summary": "no matches",
                },
                tmp,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["bugs"], [])

    def test_returns_empty_list_on_query_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._write_mock_bugzilla(tmp, raise_on_query=True)
            result = self._run_script(
                {
                    "api_key": "key",
                    "product": "Fedora",
                    "summary": "anything",
                },
                tmp,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["bugs"], [])
            self.assertIn("error", data)


if __name__ == "__main__":
    unittest.main()
