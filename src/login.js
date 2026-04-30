/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import "cockpit-dark-theme";

import React from "react";
import { createRoot } from "react-dom/client";

import { LoginPage } from "./components/login/LoginPage.jsx";

import "./components/app.scss";
import "../pkg/lib/patternfly/patternfly-6-cockpit.scss";
import "../pkg/lib/patternfly/patternfly-6-overrides.scss";

const _ = cockpit.gettext;

document.addEventListener("DOMContentLoaded", () => {
    const root = createRoot(document.getElementById("app"));
    root.render(<LoginPage />);
    document.documentElement.setAttribute("dir", cockpit.language_direction);
    document.documentElement.setAttribute("lang", convertToCockpitLang({ lang: cockpit.language }));
});
