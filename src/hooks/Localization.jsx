/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import { useContext, useEffect, useRef } from "react";

import { getKeyboardConfigurationAction } from "../actions/localization-actions.js";
import { setLuksEncryptionDataAction } from "../actions/storage-actions.js";

import { LanguageContext, StorageContext, SystemTypeContext } from "../contexts/Common.jsx";

const _ = cockpit.gettext;
const STORAGE_CONFIGURATION_STEP_ID = "anaconda-screen-storage-configuration";

// https://forge.fedoraproject.org/workstation/tickets/issues/430
export const useGnomeKeyboardMonitor = ({ currentStepId, dispatch, flatStepIds, setIsFormValid, setStepNotification }) => {
    const { desktopVariant } = useContext(SystemTypeContext);
    const { plannedVconsole } = useContext(LanguageContext);
    const { luks } = useContext(StorageContext);
    const isGnome = desktopVariant === "GNOME";

    const prevVconsoleRef = useRef(plannedVconsole);
    const currentStepIdRef = useRef(currentStepId);
    currentStepIdRef.current = currentStepId;
    const keyboardErrorRef = useRef(null);

    useEffect(() => {
        if (!isGnome) return;

        const onFocus = () => {
            dispatch(getKeyboardConfigurationAction({
                onError: (error) => {
                    const notification = {
                        message: error,
                        step: currentStepIdRef.current,
                    };
                    keyboardErrorRef.current = notification;
                    setStepNotification(notification);
                },
                onSuccess: () => {
                    setStepNotification(prev =>
                        prev === keyboardErrorRef.current ? null : prev
                    );
                    keyboardErrorRef.current = null;
                },
            }));
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [isGnome, dispatch, setStepNotification]);

    useEffect(() => {
        const prevVconsole = prevVconsoleRef.current;
        prevVconsoleRef.current = plannedVconsole;

        if (prevVconsole === undefined || prevVconsole === plannedVconsole) return;
        if (!luks.encrypted || !luks.passphrase) return;

        // Reset existing passphrase
        dispatch(setLuksEncryptionDataAction({ confirmPassphrase: "", passphrase: "" }));

        // Prompt the user to re-enter the passphrase if the keyboard layout changed in the meantime
        setStepNotification({
            message: _("The keyboard layout has changed since the disk encryption passphrase was set. Please re-enter the passphrase."),
            step: currentStepId,
        });

        // Disable forward navigation if the user is past the encryption configuration
        const currentIdx = flatStepIds.indexOf(currentStepId);
        const storageIdx = flatStepIds.indexOf(STORAGE_CONFIGURATION_STEP_ID);
        if (currentIdx <= storageIdx) return;
        setIsFormValid(false);
    }, [plannedVconsole, luks.encrypted, luks.passphrase, currentStepId, dispatch, flatStepIds, setIsFormValid, setStepNotification]);
};
