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

import { StorageContext, TargetSystemRootContext } from "../Common.jsx";
import { useMountPointConstraints, useOriginalDevices } from "./Common.jsx";

const _ = cockpit.gettext;

export const ModifyStorage = ({ idPrefix, setShowStorage }) => {
    const targetSystemRoot = useContext(TargetSystemRootContext);
    const { diskSelection } = useContext(StorageContext);
    const devices = useOriginalDevices();
    const selectedDevices = diskSelection.selectedDisks.map(disk => devices[disk].path.v);
    const mountPointConstraints = useMountPointConstraints();
    const isEfi = mountPointConstraints?.some(c => c["required-filesystem-type"]?.v === "efi");
    const cockpitAnaconda = JSON.stringify({
        available_devices: selectedDevices,
        efi: isEfi,
        mount_point_prefix: targetSystemRoot,
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
