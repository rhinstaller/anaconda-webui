#!/usr/bin/env python3
#
# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

# Search Bugzilla for open bugs similar to a given summary.
#
# This script accepts JSON input via stdin with the following structure:
# {
#     "api_key": "your-api-key-here",
#     "product": "Fedora",
#     "summary": "error message text",
#     "component": "anaconda-webui",   (optional)
#     "limit": 5                       (optional, default 5)
# }
#
# Outputs JSON to stdout:
# {
#     "bugs": [
#         {"id": 123456, "summary": "...", "status": "NEW", "url": "https://..."}
#     ]
# }

import json
import sys
from typing import Any

import bugzilla  # type: ignore[import-not-found]

BUGZILLA_BASE_URL = "https://bugzilla.redhat.com"

OPEN_STATUSES = ["NEW", "ASSIGNED", "ON_DEV", "MODIFIED", "POST"]

input_data = json.load(sys.stdin)

api_key = input_data.get("api_key")
product = input_data.get("product")
summary = input_data.get("summary", "")
component = input_data.get("component")
limit = input_data.get("limit", 5)

bz = bugzilla.Bugzilla(BUGZILLA_BASE_URL, api_key=api_key)

query_kwargs = {
    "product": product,
    "status": OPEN_STATUSES,
    # python-bugzilla maps short_desc to Bugzilla's summary search field
    "short_desc": summary,
    "limit": limit,
    "include_fields": ["id", "summary", "status"],
}
if component:
    query_kwargs["component"] = component

try:
    bugs = bz.query(bz.build_query(**query_kwargs))
except Exception as e:
    print(json.dumps({"bugs": [], "error": str(e)}))
    sys.exit(0)

result: dict[str, Any] = {
    "bugs": [
        {
            "id": bug.id,
            "summary": bug.summary,
            "status": bug.status,
            "url": f"{BUGZILLA_BASE_URL}/show_bug.cgi?id={bug.id}",
        }
        for bug in bugs
    ]
}
print(json.dumps(result))
