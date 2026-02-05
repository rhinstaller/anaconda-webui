/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

export function AvailabilityState (available = false, hidden = true, reason = null, hint = null, enforceAction = false) {
    this.available = available;
    this.enforceAction = enforceAction;
    this.hidden = hidden;
    this.reason = reason;
    this.hint = hint;
}
