#!/usr/bin/python3
#
# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Unit tests for test/compose_path/compose_path.py"""

import io
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT_DIR / "test" / "helpers" / "compose_path.py"

# Dynamické načtení skriptu ze zadané cesty SCRIPT_PATH
spec = importlib.util.spec_from_file_location("compose_path_cli", SCRIPT_PATH)
compose_path = importlib.util.module_from_spec(spec)
sys.modules["compose_path_cli"] = compose_path
spec.loader.exec_module(compose_path)

@patch("urllib.request.urlopen")
class TestComposePath(unittest.TestCase):

    def run_main_with_args(self, args):
        with patch.object(sys, "argv", ["compose_path.py"] + args):
            with patch("sys.stdout", new_callable=io.StringIO) as mock_stdout:
                compose_path.main()
                return mock_stdout.getvalue().strip()

    def test_plain_output_is_url_only(self,mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value = mock_response
        result = self.run_main_with_args(["Fedora-44-20260422.1"])
        self.assertTrue(result.startswith("http"))
        self.assertNotIn("{", result)

    def test_json_output_has_required_keys(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value = mock_response
        output = self.run_main_with_args(["--json", "Fedora-44-20260422.1"])
        result = json.loads(output)
        required_keys = {"compose_id", "url", "release_path", "used_fallback"}
        self.assertTrue(required_keys.issubset(result.keys()))

    def test_versioned_compose_uses_version_path(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value = mock_response
        output = self.run_main_with_args(["--json", "Fedora-44-20260422.1"])
        result = json.loads(output)
        self.assertFalse(result["used_fallback"])
        self.assertIn("44", result["url"])

    def test_versioned_compose_falls_back_to_branched(self, mock_urlopen):
        mock_404 = HTTPError(url="", code=404, msg="Not Found", hdrs={}, fp=None)
        mock_200 = MagicMock()
        mock_200.getcode.return_value = 200
        mock_urlopen.side_effect = [mock_404, mock_200]
        output = self.run_main_with_args(["--json", "Fedora-44-20260422.1"])
        result = json.loads(output)
        self.assertTrue(result["used_fallback"])

    def test_rawhide_compose_uses_rawhide_path(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value = mock_response
        output = self.run_main_with_args(["--json", "Fedora-Rawhide-20260422.n.0"])
        result = json.loads(output)
        self.assertIn("rawhide", result["url"].lower())

    def test_latest_fedora_versioned(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value = mock_response
        output = self.run_main_with_args(["--json", "latest-Fedora-44"])
        result = json.loads(output)
        self.assertIsNotNone(result["url"])

    def test_latest_fedora_rawhide(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value = mock_response
        output = self.run_main_with_args(["--json", "latest-Fedora-Rawhide"])
        result = json.loads(output)
        self.assertIsNotNone(result["url"])

    def test_missing_argument_fails(self, mock_urlopen):
        with patch.object(sys, "argv", ["compose_path.py"]):
            with patch("sys.stderr", new_callable=io.StringIO) as mock_stderr:
                with self.assertRaises(SystemExit) as cm:
                    compose_path.main()
        self.assertEqual(cm.exception.code, 1)
        self.assertIn("usage:", mock_stderr.getvalue().lower())

    def test_too_many_arguments_fails(self, mock_urlopen):
        with patch.object(sys, "argv", ["compose_path.py", "arg1", "arg2", "arg3"]):
            with patch("sys.stderr", new_callable=io.StringIO) as mock_stderr:
                with self.assertRaises(SystemExit) as cm:
                    compose_path.main()

        self.assertEqual(cm.exception.code, 1)

if __name__ == "__main__":
    unittest.main()