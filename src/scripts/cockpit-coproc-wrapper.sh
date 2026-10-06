#!/bin/bash

# Copyright (C) 2023 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

set -eu

# This script implements the coproc approach for the systemd service
# to avoid SELinux denials while keeping the service manageable with systemctl
# Start cockpit-bridge in unconfined context via su using coproc
coproc BRIDGE { cockpit-bridge; }

# When remote access is not enabled, use --local-session=- to connect
# directly to the bridge (skips cockpit authentication). Otherwise,
# enable tls proxy support on cockpit-ws
WS_EXTRA_ARGS=()
if [[ "${WEBUI_AUTH:-0}" != "1" ]]; then
    WS_EXTRA_ARGS+=(--local-session=-)
fi
if [[ "${WEBUI_REMOTE:-0}" == "1" ]]; then
    WS_EXTRA_ARGS+=(--for-tls-proxy)
fi

exec /usr/libexec/cockpit-ws "${WS_EXTRA_ARGS[@]}" -p 80 -a 127.0.0.1 <&${BRIDGE[0]} >&${BRIDGE[1]}
