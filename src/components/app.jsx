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

import { BossClient } from "../apis/boss.js";
import { initDataLocalization, LocalizationClient, startEventMonitorLocalization } from "../apis/localization.js";
import { initDataNetwork, NetworkClient, startEventMonitorNetwork } from "../apis/network.js";
import { PayloadsClient } from "../apis/payloads";
import { initDataRuntime, RuntimeClient, startEventMonitorRuntime } from "../apis/runtime";
import { initDataStorage, startEventMonitorStorage, StorageClient } from "../apis/storage.js";
import { UsersClient } from "../apis/users";

import { setCriticalErrorAction, setCriticalErrorFrontendAction } from "../actions/miscellaneous-actions.js";
import { initialState, reducer, useReducerWithThunk } from "../reducer.js";

import { readConf } from "../helpers/conf.js";
import { debug } from "../helpers/log.js";

import { EmptyStatePanel } from "cockpit-components-empty-state";
import { read_os_release as readOsRelease } from "os-release.js";
import { WithDialogs } from "dialogs.jsx";

import { AnacondaHeader } from "./AnacondaHeader.jsx";
import { AnacondaWizard } from "./AnacondaWizard.jsx";
import {
    AddressContext,
    LanguageContext,
    OsReleaseContext,
    RuntimeContext,
    StorageContext,
    SystemTypeContext,
    TargetSystemRootContext,
    UsersContext,
} from "./Common.jsx";
import { bugzillaPrefiledReportURL, CriticalError, errorHandlerWithContext } from "./Error.jsx";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

const MaybeBackdrop = ({ children }) => {
    const [hasDialogOpen, setHasDialogOpen] = useState(false);

    useEffect(() => {
        const handleStorageEvent = (event) => {
            if (event.key === "cockpit_has_modal") {
                setHasDialogOpen(event.newValue === "true");
            }
        };

        window.addEventListener("storage", handleStorageEvent);

        return () => window.removeEventListener("storage", handleStorageEvent);
    }, []);

    return (
        <div className={hasDialogOpen ? "cockpit-has-modal" : ""}>
            {children}
        </div>
    );
};

export const Application = () => {
    const [backendReady, setBackendReady] = useState(false);
    const [address, setAddress] = useState();
    const [state, dispatch] = useReducerWithThunk(reducer, initialState);
    const [storeInitialized, setStoreInitialized] = useState(false);
    const criticalError = state?.error?.criticalError;
    const criticalErrorFrontend = state?.error?.criticalErrorFrontend;
    const [showStorage, setShowStorage] = useState(false);

    const onCritFail = useCallback((contextData) => {
        return errorHandlerWithContext(
            contextData,
            exc => {
                if (contextData.isFrontend) {
                    dispatch(setCriticalErrorFrontendAction(exc));
                } else {
                    dispatch(setCriticalErrorAction(exc));
                }
            }
        );
    }, [dispatch]);
    const conf = useConf({ onCritFail });
    const osRelease = useOsRelease({ onCritFail });

    useEffect(() => {
        cockpit.file("/run/anaconda/backend_ready").watch(
            res => setBackendReady(res !== null)
        );
    }, []);

    useEffect(() => {
        if (!backendReady) {
            return;
        }

        // Before unload ask the user for verification
        window.onbeforeunload = () => "";

        // Listen on JS errors
        window.onerror = (message, url, line, col, errObj) => {
            dispatch(setCriticalErrorFrontendAction(errObj));
        };

        // Listen to JS errors from async operations
        const handleUnhandledRejection = (event) => {
            dispatch(setCriticalErrorFrontendAction(event.reason));
        };
        window.addEventListener("unhandledrejection", handleUnhandledRejection);
        return () => {
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };

        cockpit.file("/run/anaconda/bus.address").watch(address => {
            dispatch(setCriticalErrorAction());
            const clients = [
                new LocalizationClient(address),
                new StorageClient(address),
                new PayloadsClient(address),
                new RuntimeClient(address),
                new BossClient(address),
                new NetworkClient(address),
                new UsersClient(address),
            ];
            clients.forEach(c => c.init());

            setAddress(address);

            Promise.all([
                initDataStorage({ dispatch }),
                initDataLocalization({ dispatch }),
                initDataNetwork({ dispatch }),
                initDataRuntime({ dispatch }),
            ])
                    .then(() => {
                        setStoreInitialized(true);
                        startEventMonitorStorage({ dispatch });
                        startEventMonitorLocalization({ dispatch });
                        startEventMonitorNetwork({ dispatch });
                        startEventMonitorRuntime({ dispatch });
                    }, onCritFail({ context: N_("Reading information about the computer failed.") }));
        });
    }, [dispatch, onCritFail, backendReady]);

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
    const systemType = conf?.["Installation System"].type;
    const title = cockpit.format(_("$0 installation"), osRelease.PRETTY_NAME);

    const bzReportURL = bugzillaPrefiledReportURL({
        product: osRelease.REDHAT_BUGZILLA_PRODUCT,
        version: osRelease.REDHAT_BUGZILLA_PRODUCT_VERSION,
    });

    const page = (
        <OsReleaseContext.Provider value={osRelease}>
            <SystemTypeContext.Provider value={systemType}>
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
                        {!showStorage &&
                        <PageGroup stickyOnBreakpoint={{ default: "top" }}>
                            <AnacondaHeader
                              title={title}
                              reportLinkURL={bzReportURL}
                              isConnected={state.network.connected}
                              onCritFail={onCritFail}
                            />
                        </PageGroup>}
                        <AddressContext.Provider value={address}>
                            <TargetSystemRootContext.Provider value={conf["Installation Target"].system_root}>
                                <RuntimeContext.Provider value={state.runtime}>
                                    <WithDialogs>
                                        <AnacondaWizard
                                          onCritFail={onCritFail}
                                          title={title}
                                          dispatch={dispatch}
                                          conf={conf}
                                          setShowStorage={setShowStorage}
                                          showStorage={showStorage}
                                        />
                                    </WithDialogs>
                                </RuntimeContext.Provider>
                            </TargetSystemRootContext.Provider>
                        </AddressContext.Provider>
                    </>}
                </Page>
            </SystemTypeContext.Provider>
        </OsReleaseContext.Provider>
    );

    return (
        <WithDialogs>
            <LanguageContext.Provider value={state.localization}>
                <StorageContext.Provider value={state.storage}>
                    <UsersContext.Provider value={state.users}>
                        <MaybeBackdrop>
                            {page}
                        </MaybeBackdrop>
                    </UsersContext.Provider>
                </StorageContext.Provider>
            </LanguageContext.Provider>
        </WithDialogs>
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
