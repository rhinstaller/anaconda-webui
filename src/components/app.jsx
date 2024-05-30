/*
 * Copyright (C) 2021 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */
import cockpit from "cockpit";

import React, { useEffect, useState } from "react";
import {
    Bullseye,
    Page, PageGroup,
} from "@patternfly/react-core";

import { clients } from "../apis";

import { setCriticalErrorAction } from "../actions/miscellaneous-actions.js";
import { initialState, reducer, useReducerWithThunk } from "../reducer.js";

import { readConf } from "../helpers/conf.js";
import { debug } from "../helpers/log.js";

import { EmptyStatePanel } from "cockpit-components-empty-state";
import { read_os_release as readOsRelease } from "os-release.js";

import { AnacondaHeader } from "./AnacondaHeader.jsx";
import { AnacondaWizard } from "./AnacondaWizard.jsx";
import { MainContextWrapper } from "./Common.jsx";
import { bugzillaPrefiledReportURL, CriticalError, useError } from "./Error.jsx";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const Application = () => {
    const [state, dispatch] = useReducerWithThunk(reducer, initialState);
    const [storeInitialized, setStoreInitialized] = useState(false);
    const criticalError = state?.error?.criticalError;
    const criticalErrorFrontend = state?.error?.criticalErrorFrontend;
    const onCritFail = useError({ dispatch });
    const address = useAddress();
    const conf = useConf({ onCritFail });
    const osRelease = useOsRelease({ onCritFail });

    useEffect(() => {
        if (!address) {
            return;
        }

        // Before unload ask the user for verification
        window.onbeforeunload = () => "";

        dispatch(setCriticalErrorAction());

        Promise.all(clients.map(Client => new Client(address, dispatch).init()))
                .then(() => {
                    setStoreInitialized(true);
                }, onCritFail({ context: N_("Reading information about the computer failed.") }));
    }, [address, dispatch, onCritFail]);

    // Postpone rendering anything until we read the dbus address and the default configuration
    if (!criticalError && (!address || !conf || !osRelease || !storeInitialized)) {
        debug("Loading initial data...");
        return (
            <Page>
                <Bullseye>
                    <EmptyStatePanel loading title={_("Initializing...")} />
                </Bullseye>
            </Page>
        );
    }

    // On live media rebooting the system will actually shut it off
    const title = cockpit.format(_("$0 installation"), osRelease.PRETTY_NAME);

    const bzReportURL = bugzillaPrefiledReportURL({
        product: osRelease.REDHAT_BUGZILLA_PRODUCT,
        version: osRelease.REDHAT_BUGZILLA_PRODUCT_VERSION,
    });

    const page = (
        <Page
          data-debug={conf.Anaconda.debug}
        >
            {(criticalError || criticalErrorFrontend) &&
            <CriticalError
              exception={{ backendException: criticalError, frontendException: criticalErrorFrontend }}
              isConnected={state.network.connected}
              reportLinkURL={bzReportURL} />}
            {!criticalErrorFrontend &&
            <>
                <PageGroup stickyOnBreakpoint={{ default: "top" }}>
                    <AnacondaHeader
                      title={title}
                      reportLinkURL={bzReportURL}
                      isConnected={state.network.connected}
                      onCritFail={onCritFail}
                    />
                </PageGroup>
                <AnacondaWizard
                  isFetching={state.misc.isFetching}
                  onCritFail={onCritFail}
                  title={title}
                  dispatch={dispatch}
                  conf={conf}
                />
            </>}
        </Page>
    );

    return (
        <MainContextWrapper state={state} osRelease={osRelease} conf={conf} address={address}>
            {page}
        </MainContextWrapper>
    );
};

const useConf = ({ onCritFail }) => {
    const [conf, setConf] = useState();

    useEffect(() => {
        readConf().then(setConf, onCritFail({ context: N_("Reading installer configuration failed.") }));
    }, [onCritFail]);

    return conf;
};

const useOsRelease = ({ onCritFail }) => {
    const [osRelease, setOsRelease] = useState();

    useEffect(() => {
        readOsRelease().then(setOsRelease, onCritFail({ context: N_("Reading information about the OS failed.") }));
    }, [onCritFail]);

    return osRelease;
};

const useAddress = () => {
    const [backendReady, setBackendReady] = useState(false);
    const [address, setAddress] = useState();

    useEffect(() => {
        if (!backendReady) {
            return;
        }

        cockpit.file("/run/anaconda/bus.address").watch(address => {
            setAddress(address);
        });
    }, [backendReady]);

    useEffect(() => {
        cockpit.file("/run/anaconda/backend_ready").watch(
            res => setBackendReady(res !== null)
        );
    }, []);

    return address;
};
