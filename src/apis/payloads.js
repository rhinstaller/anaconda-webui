/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import { setPayloadTypeAction } from "../actions/payload.js";

import { error } from "../helpers/log.js";
import { _callClient, _getProperty } from "./helpers.js";

import { PayloadDNFClient } from "./payload_dnf.js";

const OBJECT_PATH = "/org/fedoraproject/Anaconda/Modules/Payloads";
const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Payloads";

const PAYLOAD_BASE_INTERFACE = INTERFACE_NAME + ".Payload";

const callClient = (...args) => {
    return _callClient(PayloadsClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

const getProperty = (...args) => {
    return _getProperty(PayloadsClient, OBJECT_PATH, INTERFACE_NAME, ...args);
};

export class PayloadsClient {
    constructor (address, dispatch) {
        if (PayloadsClient.instance && (!address || PayloadsClient.instance.address === address)) {
            return PayloadsClient.instance;
        }

        PayloadsClient.instance?.client.close();

        PayloadsClient.instance = this;

        this.client = cockpit.dbus(
            INTERFACE_NAME,
            { address, bus: "none", superuser: "try" }
        );
        this.address = address;
        this.dispatch = dispatch;
    }

    init () {
        this.client.addEventListener(
            "close", () => error("Payloads client closed")
        );

        this.initData();
    }

    async initData () {
        const activePayload = await getActivePayload();

        const payloadType = await getPayloadType(activePayload);
        this.dispatch(setPayloadTypeAction(payloadType));

        // Check payload type and initialize DNF client if needed
        await this.initPayloadClient(activePayload);
    }

    async initPayloadClient (payload) {
        // Initialize DNF client if payload type is DNF
        const payloadType = await getPayloadType(payload);
        if (payloadType === "DNF") {
            const dnfClient = new PayloadDNFClient(this.client, this.dispatch, payload);
            await dnfClient.init();
        }
    }
}

export const getPayloadType = async (payload) => {
    return _getProperty(
        PayloadsClient,
        payload,
        PAYLOAD_BASE_INTERFACE,
        "Type"
    );
};

/**
 *
 * @returns {Promise}           Resolves the total space required by the payload
 */
export const getRequiredSpace = () => {
    return callClient("CalculateRequiredSpace", []);
};

export const getActivePayload = () => {
    return getProperty("ActivePayload");
};
