/*
 * Copyright (C) 2022 Red Hat, Inc.
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

import React, { createContext, useEffect, useState } from "react";
import { Popover, PopoverPosition } from "@patternfly/react-core/dist/esm/components/Popover/index.js";
import { HelpIcon } from "@patternfly/react-icons/dist/esm/icons/help-icon";

import { WithDialogs } from "dialogs.jsx";

export const FooterContext = createContext(null);
export const LanguageContext = createContext(null);
export const OsReleaseContext = createContext(null);
export const PayloadContext = createContext(null);
export const RuntimeContext = createContext(null);
export const StorageContext = createContext(null);
export const StorageDefaultsContext = createContext(null);
export const SystemTypeContext = createContext(null);
export const TargetSystemRootContext = createContext(null);
export const UsersContext = createContext(null);
export const UserInterfaceContext = createContext(null);
export const NetworkContext = createContext(null);
export const TimezoneContext = createContext(null);
export const DialogsContext = createContext(null);
export const AppVersionContext = createContext(null);

export const FormGroupHelpPopover = ({ helpContent }) => {
    return (
        <Popover
          bodyContent={helpContent}
          position={PopoverPosition.auto}
        >
            <button
              type="button"
              onClick={e => e.preventDefault()}
              className="pf-v6-c-form__group-label-help"
            >
                <HelpIcon />
            </button>
        </Popover>
    );
};

const ModuleContextWrapper = ({ children, state }) => {
    return (
        <LanguageContext.Provider value={state.localization}>
            <RuntimeContext.Provider value={state.runtime}>
                <StorageContext.Provider value={{ ...state.storage, isFetching: state.misc.isFetching }}>
                    <UsersContext.Provider value={state.users}>
                        <NetworkContext.Provider value={state.network}>
                            <PayloadContext.Provider value={state.payload}>
                                <TimezoneContext.Provider value={state.timezone}>
                                    {children}
                                </TimezoneContext.Provider>
                            </PayloadContext.Provider>
                        </NetworkContext.Provider>
                    </UsersContext.Provider>
                </StorageContext.Provider>
            </RuntimeContext.Provider>
        </LanguageContext.Provider>
    );
};

const SystemInfoContextWrapper = ({ appVersion, children, conf, osRelease }) => {
    const [desktopVariant, setDesktopVariant] = useState();

    useEffect(() => {
        const detectDesktopVariant = async () => {
            const res = await cockpit.spawn(["ps", "-eo", "comm"]);
            if (res.includes("gnome-shell")) {
                setDesktopVariant("GNOME");
            } else {
                setDesktopVariant("UNKNOWN");
            }
        };
        detectDesktopVariant();
    }, []);

    const systemType = conf?.["Installation System"].type;
    const defaultScheme = conf?.Storage.default_scheme;

    return (
        <OsReleaseContext.Provider value={osRelease}>
            <SystemTypeContext.Provider value={{ desktopVariant, systemType }}>
                <StorageDefaultsContext.Provider value={{ defaultScheme }}>
                    <TargetSystemRootContext.Provider value={conf["Installation Target"].system_root}>
                        <UserInterfaceContext.Provider value={conf["User Interface"]}>
                            <AppVersionContext.Provider value={appVersion}>
                                {children}
                            </AppVersionContext.Provider>
                        </UserInterfaceContext.Provider>
                    </TargetSystemRootContext.Provider>
                </StorageDefaultsContext.Provider>
            </SystemTypeContext.Provider>
        </OsReleaseContext.Provider>
    );
};

export const MainContextWrapper = ({ appVersion, children, conf, osRelease, state }) => {
    return (
        <ModuleContextWrapper state={state}>
            <SystemInfoContextWrapper osRelease={osRelease} conf={conf} appVersion={appVersion}>
                <WithDialogs>
                    {children}
                </WithDialogs>
            </SystemInfoContextWrapper>
        </ModuleContextWrapper>
    );
};
