/*
 * Copyright (C) 2023 Red Hat, Inc.
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
    Button,
} from "@patternfly/react-core";
import {
    WrenchIcon,
} from "@patternfly/react-icons";

import { TargetSystemRootContext } from "../Common.jsx";
import { useMountPointConstraints } from "./Common.jsx";

const _ = cockpit.gettext;

export const ModifyStorage = ({ idPrefix, onCritFail, onRescan, setShowStorage, selectedDevices }) => {
    const targetSystemRoot = useContext(TargetSystemRootContext);
    const mountPointConstraints = useMountPointConstraints();
    const isEfi = mountPointConstraints?.some(c => c["required-filesystem-type"]?.v === "efi");
    const cockpitAnaconda = JSON.stringify({
        mount_point_prefix: targetSystemRoot,
        available_devices: selectedDevices,
        efi: isEfi,
    });

    return (
        <>
            <Button
              id={idPrefix + "-modify-storage"}
              variant="link"
              icon={<WrenchIcon />}
              onClick={() => {
                  window.sessionStorage.setItem("cockpit_anaconda", cockpitAnaconda);
                  setShowStorage(true);
              }}
            >
                {_("Modify storage")}
            </Button>
        </>
    );
};
