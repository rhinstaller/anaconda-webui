import { BossClient } from "./boss.js";
import { LocalizationClient } from "./localization.js";
import { NetworkClient } from "./network.js";
import { PayloadsClient } from "./payloads";
import { RuntimeClient } from "./runtime";
import { StorageClient } from "./storage.js";
import { TimezoneClient } from "./timezone.js";
import { UsersClient } from "./users";

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
