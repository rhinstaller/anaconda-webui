/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { applyStorage } from "../../../apis/storage_partitioning.js";

import { PageContext, StorageContext } from "../../../contexts/Common.jsx";

import { AnacondaWizardFooter } from "../../AnacondaWizardFooter.jsx";
import { createStorageValidationNotification } from "../Common.jsx";
import { DiskEncryption } from "./DiskEncryption.jsx";

const SCREEN_ID = "anaconda-screen-storage-configuration";

export const StorageConfiguration = ({ dispatch, onCritFail }) => {
    const { setIsFormValid } = useContext(PageContext) ?? {};
    const { luks, partitioning } = useContext(StorageContext);

    // Display custom footer
    const getFooter = useMemo(
        () =>
            <CustomFooter
              luks={luks}
              partitioning={partitioning.path}
            />,
        [luks, partitioning.path]
    );

    useWizardFooter(getFooter);

    useEffect(() => {
        setIsFormValid(!luks.encrypted);
    }, [setIsFormValid, luks.encrypted]);

    return (
        <DiskEncryption
          dispatch={dispatch}
          onCritFail={onCritFail}
        />
    );
};

const CustomFooter = ({ luks, partitioning }) => {
    const { setIsFormDisabled, setStepNotification } = useContext(PageContext) ?? {};
    const step = SCREEN_ID;
    const [partitioningApplied, setPartitioningApplied] = useState(false);

    const onNext = async ({ goToNextStep }) => {
        // If partitioning was already applied, proceed to next step
        if (partitioningApplied) {
            setPartitioningApplied(false);
            setStepNotification();
            goToNextStep();
            setIsFormDisabled(false);
            return;
        }

        setIsFormDisabled(true);
        try {
            const { validationReport } = await applyStorage({ luks, partitioning });
            const notification = createStorageValidationNotification(validationReport, step);

            setStepNotification(notification);
            setPartitioningApplied(notification?.variant === "warning");

            if (!notification) {
                goToNextStep();
            }
        } catch (ex) {
            setPartitioningApplied(false);
            setStepNotification({ step, ...ex });
        } finally {
            setIsFormDisabled(false);
        }
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};
