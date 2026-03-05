/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import { useEffect, useState } from "react";

export const useMaybeBackdrop = () => {
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

    return hasDialogOpen ? "cockpit-has-modal" : "";
};
