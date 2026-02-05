/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { BossClient } from "./boss.js";
import { LocalizationClient } from "./localization.js";
import { NetworkClient } from "./network.js";
import { PayloadsClient } from "./payloads.js";
import { RuntimeClient } from "./runtime.js";
import { StorageClient } from "./storage.js";
import { TimezoneClient } from "./timezone.js";
import { UsersClient } from "./users.js";

export const clients = [
    BossClient,
    LocalizationClient,
    NetworkClient,
    PayloadsClient,
    RuntimeClient,
    StorageClient,
    TimezoneClient,
    UsersClient
];
