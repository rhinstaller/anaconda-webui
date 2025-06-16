/*
 * Copyright (C) 2024 Red Hat, Inc.
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

import { useContext, useEffect, useState } from "react";

import { AvailabilityState } from "./helpers.js";

import {
    StorageContext,
} from "../../../contexts/Common.jsx";

import { helpEraseAll } from "../HelpAutopartOptions.jsx";

const _ = cockpit.gettext;

const useAvailabilityEraseAll = () => {
    const [scenarioAvailability, setScenarioAvailability] = useState();

    const { diskSelection } = useContext(StorageContext);
    const selectedDisks = diskSelection.selectedDisks;

    useEffect(() => {
        const availability = new AvailabilityState();

        availability.available = !!selectedDisks.length;
        availability.hidden = false;

        return setScenarioAvailability(availability);
    }, [selectedDisks]);

    return scenarioAvailability;
};

export const scenarioEraseAll = {
    buttonVariant: "danger",
    getAvailability: useAvailabilityEraseAll,
    getButtonLabel: () => _("Erase data and install"),
    getDetail: helpEraseAll,
    getLabel: () => _("Use entire disk"),
    id: "erase-all",
    // CLEAR_PARTITIONS_ALL = 1
    initializationMode: 1,
};
