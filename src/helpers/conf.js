/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

const CONF_PATH = "/run/anaconda/anaconda.conf";

const isEmpty = (inStr) => {
    // is string empty?
    return !(inStr || inStr.trim());
};

export const parseIni = content => {
    if (!content) {
        return;
    }
    /*
    Anaconda config files are a dialect of INI files based on Python's configparser. Unfortunately,
    that parser extends the commonly understood format with multi-line values, which is treated
    by most other parsers as an error. Because of that, custom parsing is required.
    */
    const lines = content.split(/\r\n|\r|\n/);
    const dataStore = {};
    const rxHeader = /\[([^\]]+)\].*/;
    const rxKeyValue = /(\w+) ?= ?(.*)/;

    let curHeader = "";
    let curKey = "";

    for (const line of lines) {
        let find;

        if (isEmpty(line)) {
            continue;
        }
        /* Another condition to skip a line is if it is a comment, which starts with "#".
           Fortunately, the file we use is already pre-processed by Anaconda - read and saved
           again - which strips all comments as a side effect. */

        find = rxHeader.exec(line);
        if (find && !isEmpty(find[0])) {
            curHeader = find[1];
            dataStore[curHeader] = {}; // caution, header must not repeat
            continue;
        }

        find = rxKeyValue.exec(line);
        if (find && !isEmpty(find[0])) {
            curKey = find[1];
            const value = find[2];
            dataStore[curHeader][curKey] = value;
            continue;
        }

        // by now, the line must be something else
        const fragment = line.trim();
        dataStore[curHeader][curKey] = (dataStore[curHeader][curKey] + "\n" + fragment).trim();
    }

    return dataStore;
};

export const readConf = () => {
    const confFile = cockpit.file(CONF_PATH, { superuser: "try", });
    return confFile.read()
            .then(parseIni)
            .finally(confFile.close);
};
