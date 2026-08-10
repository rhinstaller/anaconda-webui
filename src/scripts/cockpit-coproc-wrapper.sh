#!/bin/bash

# Copyright (C) 2023 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

set -eu

# This script implements the coproc approach for the systemd service
# to avoid SELinux denials while keeping the service manageable with systemctl
WEBUI_ADDRESS=$1

# Start cockpit-bridge in unconfined context via su using coproc
coproc BRIDGE { cockpit-bridge; }

# When auth is not enabled, use --local-session=- to connect
# directly to the bridge (skips cockpit authentication).
WS_EXTRA_ARGS=()
if [[ "${WEBUI_AUTH:-0}" != "1" ]]; then
    WS_EXTRA_ARGS+=(--local-session=-)
fi

exec /usr/libexec/cockpit-ws "${WS_EXTRA_ARGS[@]}" -p 80 -a "$WEBUI_ADDRESS" <&${BRIDGE[0]} >&${BRIDGE[1]}

