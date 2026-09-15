/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

// Shared flag so storage polling can stop once installation starts tearing down devices.
export const installationState = { active: false };
