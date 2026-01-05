#!/usr/bin/env python3
#
# Copyright (C) 2025 Red Hat, Inc.
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
# along with This program; If not, see <http://www.gnu.org/licenses/>.

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
