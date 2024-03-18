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

import React, { useContext } from "react";
import {
    Form,
    HelperText,
    HelperTextItem,
} from "@patternfly/react-core";

import { OsReleaseContext, SystemTypeContext } from "../Common.jsx";
import { InstallationDestination } from "./InstallationDestination.jsx";
import { InstallationScenario } from "./InstallationScenario.jsx";

const _ = cockpit.gettext;

const InstallationMethod = ({
    dispatch,
    idPrefix,
    isEfi,
    isFormDisabled,
    onCritFail,
    scenarioPartitioningMapping,
    setIsFormDisabled,
    setIsFormValid,
    setShowStorage,
}) => {
    return (
        <Form
          className={idPrefix + "-selector"}
          id={idPrefix + "-selector-form"}
          onSubmit={e => { e.preventDefault(); return false }}
        >
            <InstallationDestination
              isEfi={isEfi}
              dispatch={dispatch}
              idPrefix={idPrefix}
              isFormDisabled={isFormDisabled}
              setIsFormValid={setIsFormValid}
              setIsFormDisabled={setIsFormDisabled}
              setShowStorage={setShowStorage}
              onCritFail={onCritFail}
            />
            <InstallationScenario
              dispatch={dispatch}
              idPrefix={idPrefix}
              isFormDisabled={isFormDisabled}
              onCritFail={onCritFail}
              scenarioPartitioningMapping={scenarioPartitioningMapping}
              setIsFormValid={setIsFormValid}
            />
        </Form>
    );
};

const InstallationMethodFooterHelper = () => (
    <HelperText id="next-helper-text">
        <HelperTextItem
          variant="indeterminate">
            {_("To continue, select the devices to install to.")}
        </HelperTextItem>
    </HelperText>
);

export const usePage = ({ isFormValid }) => {
    const osRelease = useContext(OsReleaseContext);
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    return ({
        component: InstallationMethod,
        footerHelperText: !isFormValid && <InstallationMethodFooterHelper />,
        id: "installation-method",
        label: _("Installation method"),
        title: !isBootIso ? cockpit.format(_("Welcome. Let's install $0 now."), osRelease.REDHAT_SUPPORT_PRODUCT) : null,
    });
};
