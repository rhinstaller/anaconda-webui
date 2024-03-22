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
import React, { createContext, useEffect, useState } from "react";
import { Popover, PopoverPosition } from "@patternfly/react-core";
import { HelpIcon } from "@patternfly/react-icons";

import { WithDialogs } from "dialogs.jsx";

export const AddressContext = createContext("");
export const FooterContext = createContext(null);
export const LanguageContext = createContext(null);
export const OsReleaseContext = createContext(null);
export const RuntimeContext = createContext(null);
export const StorageContext = createContext(null);
export const SystemTypeContext = createContext(null);
export const TargetSystemRootContext = createContext(null);
export const UsersContext = createContext(null);

export const FormGroupHelpPopover = ({ helpContent }) => {
    return (
        <Popover
          bodyContent={helpContent}
          position={PopoverPosition.auto}
        >
            <button
              type="button"
              onClick={e => e.preventDefault()}
              className="pf-v5-c-form__group-label-help"
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
                <StorageContext.Provider value={state.storage}>
                    <UsersContext.Provider value={state.users}>
                        {children}
                    </UsersContext.Provider>
                </StorageContext.Provider>
            </RuntimeContext.Provider>
        </LanguageContext.Provider>
    );
};

const SystemInfoContextWrapper = ({ children, conf, osRelease }) => {
    const systemType = conf?.["Installation System"].type;

    return (
        <OsReleaseContext.Provider value={osRelease}>
            <SystemTypeContext.Provider value={systemType}>
                <TargetSystemRootContext.Provider value={conf["Installation Target"].system_root}>
                    {children}
                </TargetSystemRootContext.Provider>
            </SystemTypeContext.Provider>
        </OsReleaseContext.Provider>
    );
};

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

export const MainContextWrapper = ({ address, children, conf, osRelease, state }) => {
    return (
        <ModuleContextWrapper state={state}>
            <SystemInfoContextWrapper osRelease={osRelease} conf={conf}>
                <WithDialogs>
                    <MaybeBackdrop>
                        <AddressContext.Provider value={address}>
                            {children}
                        </AddressContext.Provider>
                    </MaybeBackdrop>
                </WithDialogs>
            </SystemInfoContextWrapper>
        </ModuleContextWrapper>
    );
};
