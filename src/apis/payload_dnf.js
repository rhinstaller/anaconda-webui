/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import {
    getPayloadEnvironmentsAction,
    getPayloadGroupsAction,
    getPayloadPackagesSelectionAction,
} from "../actions/payload-dnf-actions.js";

import { _getProperty, _setProperty, objectFromDbus, objectToDbus } from "./helpers.js";

import { PayloadsClient } from "./payloads.js";

const INTERFACE_NAME = "org.fedoraproject.Anaconda.Modules.Payloads.Payload.DNF";

const callClient = (method, args = []) => {
    const payload = PayloadDNFClient.instance.payload;
    return new PayloadsClient().client.call(
        payload,
        INTERFACE_NAME,
        method,
        args
    ).then(res => res[0]);
};

const getProperty = (...args) => {
    const payload = PayloadDNFClient.instance.payload;
    return _getProperty(PayloadsClient, payload, INTERFACE_NAME, ...args);
};

const setProperty = (...args) => {
    const payload = PayloadDNFClient.instance.payload;
    return _setProperty(PayloadsClient, payload, INTERFACE_NAME, ...args);
};

export class PayloadDNFClient {
    constructor (client, dispatch, payload) {
        if (PayloadDNFClient.instance && PayloadDNFClient.instance.payload === payload) {
            return PayloadDNFClient.instance;
        }

        PayloadDNFClient.instance = this;

        // Reuse the PayloadsClient's DBus client
        this.client = client;
        this.dispatch = dispatch;
        this.payload = payload;
        this._lastEnvironment = null;
    }

    async init () {
        this.startEventMonitor();

        await this.initData();
    }

    async initData () {
        await this.dispatch(getPayloadEnvironmentsAction());
        await this.dispatch(getPayloadPackagesSelectionAction());

        // Fetch groups for initial environment
        const selection = await getPackagesSelection();
        const environment = selection?.environment;
        this._lastEnvironment = environment;
        if (environment) {
            await this.dispatch(getPayloadGroupsAction(environment));
        }
    }

    _handleEnvironmentChange (environment) {
        // Fetch groups when environment changes
        if (environment !== this._lastEnvironment) {
            this._lastEnvironment = environment;
            this.dispatch(getPayloadGroupsAction(environment));
        }
    }

    startEventMonitor () {
        this.client.subscribe(
            { },
            (path, iface, signal, args) => {
                switch (signal) {
                case "PropertiesChanged":
                    if (path === this.payload &&
                        args[0] === INTERFACE_NAME &&
                        Object.hasOwn(args[1], "PackagesSelection")) {
                        if (args[1].PackagesSelection.v.environment.v) {
                            this._handleEnvironmentChange(args[1].PackagesSelection.v.environment.v);
                        }
                        this.dispatch(getPayloadPackagesSelectionAction());
                    }
                    break;
                }
            }
        );
    }
}

export const getDefaultEnvironment = async () => {
    return callClient("GetDefaultEnvironment", []);
};

export const getEnvironments = async () => {
    return callClient("GetEnvironments", []);
};

export const resolveEnvironment = async (environmentSpec) => {
    return callClient("ResolveEnvironment", [environmentSpec]);
};

export const getEnvironmentData = async (environmentSpec) => {
    const structure = await callClient("GetEnvironmentData", [environmentSpec]);
    return objectFromDbus(structure);
};

export const getGroupData = async (groupSpec) => {
    const structure = await callClient("GetGroupData", [groupSpec]);
    return objectFromDbus(structure);
};

export const getPackagesSelection = async () => {
    const structure = await getProperty("PackagesSelection");
    return objectFromDbus(structure);
};

export const setPackagesSelection = async ({ environment, groups } = {}) => {
    const currentSelection = await getPackagesSelection();

    const updatedSelection = {
        ...currentSelection,
    };

    if (environment !== undefined) {
        updatedSelection.environment = environment || "";
    }

    if (groups !== undefined) {
        updatedSelection.groups = groups;
    }

    const structure = objectToDbus(updatedSelection);

    return setProperty("PackagesSelection", cockpit.variant("a{sv}", structure));
};
