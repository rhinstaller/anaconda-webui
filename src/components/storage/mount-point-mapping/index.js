/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { MountPointMapping, usePartitioningReuse } from "./MountPointMapping.jsx";

const _ = cockpit.gettext;

export class Page {
    _description = "Manual configuration of disk partitions and mount points for advanced storage setups.";

    constructor ({ storageScenarioId }) {
        this.component = MountPointMapping;
        this.id = "anaconda-screen-mount-point-mapping";
        this.isHidden = storageScenarioId !== "mount-point-mapping";
        this.label = _("Manual disk configuration");
        this.title = _("Manual disk configuration: Mount point mapping");
        this.usePageInit = usePartitioningReuse;
    }
}
