#!/usr/bin/python3
#
# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Unit tests for src/scripts/encrypt-user-pw.py"""

import crypt_r
import subprocess
import sys
import unittest

SCRIPT_PATH = "src/scripts/encrypt-user-pw.py"

class TestEncryptUserPw(unittest.TestCase):
    def run_script(self, args):
        return subprocess.run(
            [sys.executable, SCRIPT_PATH] + args, 
            capture_output=True, 
            text=True)

    def test_hash_starts_with_dollar(self):
        password = "my_password"
        result = self.run_script([password])
        self.assertEqual(result.returncode, 0)
        self.assertRegex(result.stdout.strip(), r"^\$[0-9a-zA-Z]+\$")

    def test_hash_is_not_plaintext(self):
        password = "my_password"
        result = self.run_script([password])
        self.assertEqual(result.returncode, 0)
        self.assertNotEqual(result.stdout.strip(), password)

    def test_same_password_produces_different_hashes(self):
        password = "my_password"
        result1 = self.run_script([password])
        result2 = self.run_script([password])
        self.assertEqual(result1.returncode, 0)
        self.assertEqual(result2.returncode, 0)
        self.assertNotEqual(result1.stdout, result2.stdout)

    def test_hash_verifies_with_crypt_r(self):
        password = "my_password"
        result = self.run_script([password])
        hash = result.stdout.strip()
        self.assertEqual(crypt_r.crypt(password, hash), hash)

    def test_missing_password_argument_fails(self):
        result = self.run_script([])
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "")
        self.assertIn("Usage:", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertNotIn("IndexError", result.stderr) 

    def test_literal_help_password_is_hashed(self):
        password = "--help"
        result = self.run_script([password])
        self.assertEqual(result.returncode, 0)
        self.assertRegex(result.stdout.strip(), r"^\$[0-9a-zA-Z]+\$")

    def test_too_many_arguments_fails(self):
        result = self.run_script(["my", "password"])
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "")
        self.assertIn("Error:", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertNotIn("IndexError", result.stderr) 

    def test_success_prints_only_hash_to_stdout(self):
        password = "my_password"
        result = self.run_script([password])
        self.assertEqual(result.returncode, 0)
        self.assertRegex(result.stdout.strip(), r"^\$[0-9a-zA-Z]+\$")
        self.assertEqual(len(result.stderr), 0)


if __name__ == "__main__":
    unittest.main()



