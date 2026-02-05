/*
 * Copyright (C) 2024 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { applyStorage } from "../../../apis/storage_partitioning.js";

import { StorageContext } from "../../../contexts/Common.jsx";

import { AnacondaWizardFooter } from "../../AnacondaWizardFooter.jsx";
import { createWarningNotification } from "../Common.jsx";
import { DiskEncryption } from "./DiskEncryption.jsx";

const SCREEN_ID = "anaconda-screen-storage-configuration";

export const StorageConfiguration = ({ dispatch, onCritFail, setIsFormValid, setStepNotification }) => {
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
          onCritFail={onCritFail}
          setIsFormValid={setIsFormValid}
        />
    );
};

const CustomFooter = ({ luks, partitioning, setStepNotification }) => {
    const step = SCREEN_ID;
    const [partitioningApplied, setPartitioningApplied] = useState(false);

    const onNext = ({ goToNextStep, setIsFormDisabled }) => {
        // If partitioning was already applied, proceed to next step
        if (partitioningApplied) {
            setPartitioningApplied(false);
            setStepNotification();
            goToNextStep();
            setIsFormDisabled(false);
            return Promise.resolve();
        }

        setIsFormDisabled(true);
        return applyStorage({
            luks,
            onFail: ex => {
                setIsFormDisabled(false);
                setPartitioningApplied(false);
                setStepNotification({ step, ...ex });
            },
            onSuccess: (validationReport) => {
                const warningNotification = createWarningNotification(validationReport, step);

                setStepNotification(warningNotification);
                setPartitioningApplied(!!warningNotification);

                if (!warningNotification) {
                    goToNextStep();
                }
                setIsFormDisabled(false);
            },
            partitioning,
        });
    };

    return <AnacondaWizardFooter onNext={onNext} />;
};
