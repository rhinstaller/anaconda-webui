/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import VERSION from "../../VERSION.txt";

export const getAnacondaVersion = () => {
    return cockpit
            .spawn(["anaconda", "--version"])
            .then((content) => content.split(" ").slice(-1)[0].replace("\n", ""));
};

export const getAnacondaUIVersion = () => {
    return VERSION.trim().replace("\n", "");
};
