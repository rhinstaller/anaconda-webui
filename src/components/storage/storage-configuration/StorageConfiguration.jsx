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

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useWizardFooter } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { applyStorage } from "../../../apis/storage_partitioning.js";

import { StorageContext } from "../../../contexts/Common.jsx";

import { AnacondaWizardFooter } from "../../AnacondaWizardFooter.jsx";
import { createWarningNotification } from "../Common.jsx";
import { DiskEncryption } from "./DiskEncryption.jsx";

const SCREEN_ID = "anaconda-screen-storage-configuration";

export const StorageConfiguration = ({ dispatch, setIsFormValid, setStepNotification }) => {
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
