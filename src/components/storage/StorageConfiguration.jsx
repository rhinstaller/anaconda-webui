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

import React, { useContext, useEffect, useMemo } from "react";
import { useWizardFooter } from "@patternfly/react-core";

import { applyStorage, resetPartitioning } from "../../apis/storage_partitioning.js";

import { setLuksEncryptionDataAction } from "../../actions/storage-actions.js";

import { AnacondaWizardFooter } from "../AnacondaWizardFooter.jsx";
import { FooterContext, StorageContext } from "../../contexts/Common.jsx";
import { DiskEncryption } from "./DiskEncryption.jsx";

const _ = cockpit.gettext;

const StorageConfiguration = ({ dispatch, setIsFormValid, setStepNotification }) => {
    const { luks, partitioning } = useContext(StorageContext);

    // Display custom footer
    const getFooter = useMemo(
        () =>
            <CustomFooter
              luks={luks}
              partitioning={partitioning.path}
              setStepNotification={setStepNotification}
            />,
        [luks, partitioning.path, setStepNotification]
    );

    useWizardFooter(getFooter);

    useEffect(() => {
        setIsFormValid(!luks.encrypted);
    }, [setIsFormValid, luks.encrypted]);

    return (
        <DiskEncryption
          dispatch={dispatch}
          isEncrypted={luks.encrypted}
          password={luks.passphrase}
          setIsEncrypted={(value) => dispatch(setLuksEncryptionDataAction({ encrypted: value }))}
          setIsFormValid={setIsFormValid}
          setPassword={(value) => dispatch(setLuksEncryptionDataAction({ passphrase: value }))}
        />
    );
};

const CustomFooter = ({ luks, partitioning, setStepNotification }) => {
    const step = new Page().id;
    const onNext = ({ goToNextStep, setIsFormDisabled }) => {
        setIsFormDisabled(true);
        return applyStorage({
            luks,
            onFail: ex => {
                setIsFormDisabled(false);
                setStepNotification({ step, ...ex });
            },
            onSuccess: () => {
                goToNextStep();

                // Reset the state after the onNext call. Otherwise,
                // React will try to render the current step again.
                setIsFormDisabled(false);
                setStepNotification();
            },
            partitioning,
        });
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};

const usePageInit = () => {
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const { setIsFormDisabled } = useContext(FooterContext);
    // Reset the partitioning before applying the new one, because in the 'use-free-space' case
    // the remaining space is not calculated correctly if the partitioning is not reset.
    // FIXME: https://issues.redhat.com/browse/INSTALLER-3982
    // This is a workaround, as reseting the partitioning just before the 'applyStorage'
    // call results in a deadlock.
    const needsReset = appliedPartitioning && appliedPartitioning !== partitioning.path;

    useEffect(() => {
        const _resetPartitioning = async () => {
            await resetPartitioning();
        };

        if (needsReset) {
            _resetPartitioning();
        }
    }, [needsReset]);

    useEffect(() => {
        if (!needsReset) {
            setIsFormDisabled(false);
        }
    }, [needsReset, setIsFormDisabled]);
};

export class Page {
    constructor (isBootIso, storageScenarioId) {
        this.component = StorageConfiguration;
        this.id = "storage-configuration";
        this.isHidden = ["mount-point-mapping", "use-configured-storage", "home-reuse"].includes(storageScenarioId);
        this.label = _("Storage configuration");
        this.title = _("Storage configuration");
        this.usePageInit = usePageInit;
    }
}
