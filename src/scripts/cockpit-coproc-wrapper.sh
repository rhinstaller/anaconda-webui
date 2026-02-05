#!/bin/bash

# Copyright (C) 2023 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

set -eu

# This script implements the coproc approach for the systemd service
# to avoid SELinux denials while keeping the service manageable with systemctl
WEBUI_ADDRESS=$1

# Start cockpit-bridge in unconfined context via su using coproc
coproc BRIDGE { cockpit-bridge; }

# Start cockpit-ws connected to the coproc
exec /usr/libexec/cockpit-ws -p 80 -a "$WEBUI_ADDRESS" --no-tls --local-session=- <&${BRIDGE[0]} >&${BRIDGE[1]}
