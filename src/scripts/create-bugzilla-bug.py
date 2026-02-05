#!/usr/bin/env python3
#
# Copyright (C) 2025 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

# Create a Bugzilla bug report using the python-bugzilla API.
#
# This script accepts JSON input via stdin with the following structure:
# {
#     "product": "Fedora",
#     "version": "rawhide",
#     "component": "anaconda",
#     "summary": "Bug summary",
#     "description": "Full bug description",
#     "log_files": ["/tmp/journal.log", "/tmp/anaconda-webui.log"],
#     "api_key": "your-api-key-here"    # Required for authentication
# }
#
# Outputs JSON to stdout:
# {
#     "success": true,
#     "bug_id": 123456,
#     "url": "https://bugzilla.redhat.com/show_bug.cgi?id=123456",
#     "attachments": [123456, 123457]
# }

import json
import os
import sys

import bugzilla  # type: ignore[import-not-found]

BUGZILLA_BASE_URL = "https://bugzilla.redhat.com"

input_data = json.load(sys.stdin)

product = input_data.get("product")
version = input_data.get("version")
component = input_data.get("component", "anaconda")
summary = input_data.get("summary", "") or "Anaconda installer error"
description = input_data.get("description", "")
log_files = input_data.get("log_files", [])
api_key = input_data.get("api_key")

# Connect to Bugzilla with API key (authentication already validated)
bz = bugzilla.Bugzilla(BUGZILLA_BASE_URL, api_key=api_key)

# Create the bug
newbug = bz.createbug(
    product=product,
    version=version,
    component=component,
    summary=summary,
    description=description
)

bug_id = newbug.id

# Attach log files if provided
attachments = []
for log_file in log_files:
    if os.path.exists(log_file):
        attachment_id = bz.attachfile(
            bug_id,
            log_file,
            description=f"Log file: {log_file}",
            file_name=os.path.basename(log_file),
            content_type="text/plain",
            is_patch=False,
            is_private=True
        )

        if attachment_id:
            attachments.append(attachment_id)

# Output success result
bug_url = f"{BUGZILLA_BASE_URL}/show_bug.cgi?id={bug_id}"
result = {
    "success": True,
    "bug_id": bug_id,
    "url": bug_url,
    "attachments": attachments
}
print(json.dumps(result))
