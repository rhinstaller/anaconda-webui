/*
 * Copyright (C) 2021 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import "cockpit-dark-theme";

import React from "react";
import { createRoot } from "react-dom/client";

import { convertToCockpitLang } from "./helpers/language.js";

import { ApplicationWithErrorBoundary } from "./components/app.jsx";

import "./components/app.scss";
import "../pkg/lib/patternfly/patternfly-6-cockpit.scss";
/*
 * PF4 overrides need to come after the JSX components imports because
 * these are importing CSS stylesheets that we are overriding
 * Having the overrides here will ensure that when mini-css-extract-plugin will extract the CSS
 * out of the dist/index.js and since it will maintain the order of the imported CSS,
 * the overrides will be correctly in the end of our stylesheet.
 */
import "../pkg/lib/patternfly/patternfly-6-overrides.scss";

document.addEventListener("DOMContentLoaded", function () {
    const root = createRoot(document.getElementById("app"));
    root.render(<ApplicationWithErrorBoundary />);
    document.documentElement.setAttribute("dir", cockpit.language_direction);
    document.documentElement.setAttribute("lang", convertToCockpitLang({ lang: cockpit.language }));
});

// As we are changing the language from the same iframe the localstorage change (cockpit.lang) will not fire.
// See Note section here for details: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
// We need to listen to the virtual event that we generate when changing language and adjust the language direction accordingly.
// This needs to be exposed as a helper function from cockpit: https://github.com/cockpit-project/cockpit/issues/18874
window.addEventListener("cockpit-lang", () => {
    document.documentElement.setAttribute("lang", convertToCockpitLang({ lang: cockpit.language }));
    if (cockpit.language_direction) {
        document.documentElement.setAttribute("dir", cockpit.language_direction);
    }
});
