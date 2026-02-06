/*
 * Copyright (C) 2021 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Page, PageGroup, PageSection, PageSectionTypes } from "@patternfly/react-core/dist/esm/components/Page/index.js";

import { clients } from "../apis/index.js";

import { initialState, reducer, useReducerWithThunk } from "../reducer.js";

import { readConf } from "../helpers/conf.js";
import { debug } from "../helpers/log.js";
import { getAnacondaUIVersion, getAnacondaVersion } from "../helpers/product.js";

import { MainContextWrapper } from "../contexts/Common.jsx";

import { EmptyStatePanel } from "cockpit-components-empty-state";
import { read_os_release as readOsRelease } from "os-release.js";

import { AnacondaHeader } from "./AnacondaHeader.jsx";
import { AnacondaWizard } from "./AnacondaWizard.jsx";
import { ErrorBoundary } from "./Error.jsx";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const ApplicationLoading = () => (
    <PageSection className="installation-page--loading" hasBodyWrapper={false} type={PageSectionTypes.wizard}>
        <EmptyStatePanel loading title={_("Initializing...")} />
    </PageSection>
);

export const Application = ({ conf, dispatch, isFetching, onCritFail, osRelease, reportLinkURL, setShowStorage, showStorage }) => {
    const [storeInitialized, setStoreInitialized] = useState(false);
    const [currentStepId, setCurrentStepId] = useState();
    const address = useAddress(onCritFail);

    useEffect(() => {
        if (!address) {
            return;
        }

        // Before unload ask the user for verification
        const preventExit = () => {
            return "";
        };

        // Attach the beforeunload event handler
        window.addEventListener("beforeunload", preventExit);

        // Function to temporarily disable beforeunload
        const allowExternalNavigation = (event) => {
            const link = event.target.closest("a");
            if (link && (link.href.startsWith("extlink:") || link.href.startsWith("anaconda-gnome-control-center:"))) {
                window.removeEventListener("beforeunload", preventExit);
                setTimeout(() => {
                    window.addEventListener("beforeunload", preventExit);
                }, 1000); // Re-enable after 1 second
            }
        };

        // Attach a click event listener to detect external link clicks
        document.addEventListener("click", allowExternalNavigation);

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
              isFilled={false}
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

const useAddress = (onCritFail) => {
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

    const wasReadyRef = useRef(false);

    useEffect(() => {
        cockpit.file("/run/anaconda/backend_ready").watch(
            (content) => {
                const isReady = content !== null;

                if (isReady) {
                    wasReadyRef.current = true;
                }

                setBackendReady(isReady);

                if (!isReady && wasReadyRef.current && onCritFail) {
                    onCritFail()({
                        message: _("The Anaconda installation has stopped unexpectedly."),
                    });
                }
            }
        );
    }, [onCritFail]);

    return address;
};

const useAppVersion = () => {
    const initialState = {
        webui: getAnacondaUIVersion(),
    };
    const [appVersion, setAppVersion] = useState(initialState);

    useEffect(() => {
        getAnacondaVersion().then(value => setAppVersion(obj => ({ ...obj, backend: value })));
    }, []);
    return appVersion;
};

export const ApplicationWithErrorBoundary = () => {
    const [showStorage, setShowStorage] = useState(false);
    const [state, dispatch] = useReducerWithThunk(reducer, initialState);
    const [errorBeforeBoundary, setErrorBeforeBoundary] = useState();
    const onCritFail = useCallback(
        (context) => (exc) => setErrorBeforeBoundary({ contextData: { context }, ...exc }),
        []
    );
    const conf = useConf({ onCritFail });
    const osRelease = useOsRelease({ onCritFail });
    const appVersion = useAppVersion();

    if (!conf || !osRelease) {
        return <ApplicationLoading />;
    }

    return (
        <MainContextWrapper state={state} osRelease={osRelease} conf={conf} appVersion={appVersion}>
            <Page className="no-masthead-sidebar" data-debug={conf.Anaconda.debug}>
                <ErrorBoundary
                  backendException={errorBeforeBoundary}
                  showStorage={showStorage}
                >
                    <Application
                      dispatch={dispatch}
                      isFetching={state.misc.isFetching}
                      osRelease={osRelease}
                      showStorage={showStorage}
                      setShowStorage={setShowStorage}
                      state={state}
                    />
                </ErrorBoundary>
            </Page>
        </MainContextWrapper>
    );
};
