#!/usr/bin/env python3
#
# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

# Validate a Bugzilla API key using the python-bugzilla API.
#
# This script accepts JSON input via stdin with the following structure:
# {
#     "api_key": "your-api-key-here"    # Required for authentication
# }
#
# Outputs nothing on success, or prints an error message to stdout and exits with code 1 on failure.

import json
import sys
from xmlrpc.client import Fault

import bugzilla  # type: ignore[import-not-found]

BUGZILLA_BASE_URL = "https://bugzilla.redhat.com"

input_data = json.load(sys.stdin)
api_key = input_data.get("api_key")

bz = bugzilla.Bugzilla(BUGZILLA_BASE_URL, api_key=api_key)

# Validate the API key by checking if we're logged in
# This will raise an exception if the API key is invalid
try:
    logged_in = bz.logged_in
except Fault as e:
    # Handle Bugzilla API errors (e.g., invalid API key)
    error_msg = str(e.faultString) if hasattr(e, 'faultString') else str(e)
    raise SystemExit(error_msg) from e
