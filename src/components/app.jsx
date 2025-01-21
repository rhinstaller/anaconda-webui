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

import React, { useCallback, useEffect, useState } from "react";
import {
    Bullseye,
    Page, PageGroup,
} from "@patternfly/react-core";

import { clients } from "../apis";

import { initialState, reducer, useReducerWithThunk } from "../reducer.js";

import { readConf } from "../helpers/conf.js";
import { debug } from "../helpers/log.js";

import { MainContextWrapper } from "../contexts/Common.jsx";

import { EmptyStatePanel } from "cockpit-components-empty-state";
import { read_os_release as readOsRelease } from "os-release.js";

import { AnacondaHeader } from "./AnacondaHeader.jsx";
import { AnacondaWizard } from "./AnacondaWizard.jsx";
import { bugzillaPrefiledReportURL, ErrorBoundary } from "./Error.jsx";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const ApplicationLoading = () => (
    <Page>
        <Bullseye>
            <EmptyStatePanel loading title={_("Initializing...")} />
        </Bullseye>
    </Page>
);

export const Application = ({ conf, dispatch, isFetching, onCritFail, osRelease, reportLinkURL }) => {
    const [storeInitialized, setStoreInitialized] = useState(false);
    const [showStorage, setShowStorage] = useState(false);
    const [currentStepId, setCurrentStepId] = useState();
    const address = useAddress();

    useEffect(() => {
        if (!address) {
            return;
        }

        // Before unload ask the user for verification
        window.onbeforeunload = () => "";

        Promise.all(clients.map(Client => new Client(address, dispatch).init()))
                .then(() => {
                    setStoreInitialized(true);
                }, onCritFail({ context: N_("Reading information about the computer failed.") }));
    }, [address, dispatch, onCritFail]);

    // Postpone rendering anything until we read the dbus address and the default configuration
    if (!address || !storeInitialized) {
        debug("Loading initial data...");
        return <ApplicationLoading />;
    }

    // On live media rebooting the system will actually shut it off
    const title = cockpit.format(_("$0 installation"), osRelease.PRETTY_NAME);

    return (
        <>
            <PageGroup
              stickyOnBreakpoint={{ default: "top" }}>
                <AnacondaHeader
                  currentStepId={currentStepId}
                  dispatch={dispatch}
                  title={title}
                  reportLinkURL={reportLinkURL}
                  onCritFail={onCritFail}
                  showStorage={showStorage}
                  setShowStorage={setShowStorage}
                />
            </PageGroup>
            <AnacondaWizard
              currentStepId={currentStepId}
              isFetching={isFetching}
              onCritFail={onCritFail}
              title={title}
              dispatch={dispatch}
              conf={conf}
              setCurrentStepId={setCurrentStepId}
              showStorage={showStorage}
            />
        </>
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

export const ApplicationWithErrorBoundary = () => {
    const [state, dispatch] = useReducerWithThunk(reducer, initialState);
    const [errorBeforeBoundary, setErrorBeforeBoundary] = useState();
    const onCritFail = useCallback(
        (context) => (exc) => setErrorBeforeBoundary({ contextData: { context }, ...exc }),
        []
    );
    const conf = useConf({ onCritFail });
    const osRelease = useOsRelease({ onCritFail });
    const isBootIso = conf?.["Installation System"].type === "BOOT_ISO";

    if (!conf || !osRelease) {
        return <ApplicationLoading />;
    }

    const bzReportURL = bugzillaPrefiledReportURL({
        product: osRelease.REDHAT_BUGZILLA_PRODUCT,
        version: osRelease.REDHAT_BUGZILLA_PRODUCT_VERSION,
    }, isBootIso);

    return (
        <MainContextWrapper state={state} osRelease={osRelease} conf={conf}>
            <Page data-debug={conf.Anaconda.debug}>
                <ErrorBoundary
                  backendException={errorBeforeBoundary}
                  isNetworkConnected={state.network.connected}
                  reportLinkURL={bzReportURL}>
                    <Application
                      dispatch={dispatch}
                      isFetching={state.misc.isFetching}
                      osRelease={osRelease}
                      reportLinkURL={bzReportURL}
                      state={state}
                    />
                </ErrorBoundary>
            </Page>
        </MainContextWrapper>
    );
};
