/*
 * Copyright (C) 2025 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

import React, { useContext, useEffect, useRef } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { useWizardContext } from "@patternfly/react-core/dist/esm/components/Wizard/index.js";

import { setSelectedDisks } from "../../../apis/storage_disks_selection.js";
import { applyStorage } from "../../../apis/storage_partitioning.js";

import { selectDefaultDisks } from "../../../helpers/storage.js";
import { checkIfArraysAreEqual } from "../../../helpers/utils.js";

import { PageContext, StorageContext } from "../../../contexts/Common.jsx";

import {
    useFreeSpaceForSystem,
    useRequiredSize,
} from "../../../hooks/Storage.jsx";

import { createStorageValidationNotification } from "../Common.jsx";

const _ = cockpit.gettext;

const REVIEW_STEP_ID = "anaconda-screen-review";
const STORAGE_METHOD_STEP_ID = "anaconda-screen-method";
const MOUNT_POINT_MAPPING_STEP_ID = "anaconda-screen-mount-point-mapping";

/** Readiness of storage configuration for the review step */
const StorageCompleteStatus = Object.freeze({
    INSUFFICIENT: "insufficient",
    OK: "ok",
    PENDING: "pending",
});

/**
 * Storage readiness for the review screen (partitioning applied, scenario set, and enough free space).
 * ``status`` is one of ``StorageCompleteStatus``.
 */
export const useStorageComplete = () => {
    const { appliedPartitioning, storageScenarioId } = useContext(StorageContext);
    const freeSpace = useFreeSpaceForSystem();
    const requiredSize = useRequiredSize();

    const hasInsufficientSpace =
        requiredSize != null && freeSpace != null && requiredSize > freeSpace;

    const pending =
        !appliedPartitioning ||
        !storageScenarioId ||
        !requiredSize ||
        !freeSpace;

    if (pending) {
        return { freeSpace, requiredSize, status: StorageCompleteStatus.PENDING };
    }

    return {
        freeSpace,
        requiredSize,
        status: hasInsufficientSpace
            ? StorageCompleteStatus.INSUFFICIENT
            : StorageCompleteStatus.OK,
    };
};

const useApplyDefaultDisksOnReview = () => {
    const refUsableDisks = useRef();
    const { diskSelection } = useContext(StorageContext) ?? {};
    const usableDisksStr = diskSelection?.usableDisks?.join?.(",") ?? "";

    useEffect(() => {
        refUsableDisks.current = false;
    }, [usableDisksStr]);

    useEffect(() => {
        if (refUsableDisks.current === true || !diskSelection) {
            return;
        }

        refUsableDisks.current = true;

        const defaultDisks = selectDefaultDisks({
            ignoredDisks: diskSelection.ignoredDisks,
            selectedDisks: diskSelection.selectedDisks,
            usableDisks: diskSelection.usableDisks,
        });

        if (!checkIfArraysAreEqual(diskSelection.selectedDisks, defaultDisks)) {
            setSelectedDisks({ drives: defaultDisks });
        }
    }, [diskSelection]);
};

const useApplyStorageOnReview = () => {
    const { appliedPartitioning, partitioning } = useContext(StorageContext);
    const { setStepNotification } = useContext(PageContext) ?? {};
    const partitioningPath = partitioning?.path;

    useEffect(() => {
        if (appliedPartitioning) {
            return;
        }

        const step = REVIEW_STEP_ID;
        applyStorage({
            onFail: ex => {
                setStepNotification?.({ step, ...ex });
            },
            onSuccess: validationReport => {
                const notification = createStorageValidationNotification(validationReport, step);

                if (notification) {
                    setStepNotification?.(notification);
                } else {
                    setStepNotification?.();
                }
            },
            partitioning: partitioningPath,
        }).catch(() => {});
    }, [appliedPartitioning, partitioningPath, setStepNotification]);
};

const useStorageSpaceNotification = (status, freeSpace, requiredSize) => {
    const { appliedPartitioning, storageScenarioId } = useContext(StorageContext);
    const { setStepNotification } = useContext(PageContext) ?? {};
    const { goToStepById } = useWizardContext();
    const fixupStepId = storageScenarioId === "mount-point-mapping"
        ? MOUNT_POINT_MAPPING_STEP_ID
        : STORAGE_METHOD_STEP_ID;

    useEffect(() => {
        if (!appliedPartitioning) {
            return;
        }
        if (status === StorageCompleteStatus.INSUFFICIENT) {
            const title = _("Not enough available free space");
            const message = cockpit.format(
                _("$0 is required, but only $1 is available."),
                cockpit.format_bytes(requiredSize),
                cockpit.format_bytes(freeSpace)
            );
            const actionLinks = (
                <Button
                  id={`${REVIEW_STEP_ID}-change-partition-layout`}
                  variant="link"
                  isInline
                  onClick={() => {
                      cockpit.location.go([fixupStepId]);
                      goToStepById(fixupStepId);
                  }}
                >
                    {_("Change partition layout")}
                </Button>
            );
            setStepNotification?.({
                actionLinks,
                message,
                step: REVIEW_STEP_ID,
                title,
            });
        } else {
            setStepNotification?.();
        }
    }, [
        appliedPartitioning,
        fixupStepId,
        freeSpace,
        goToStepById,
        requiredSize,
        setStepNotification,
        status,
    ]);
};

/**
 * Storage completion check for the Review step
 * (1) run ``applyStorage`` on the current partitioning path when nothing is applied yet
 * (2) check for sufficient free space
 */
export const usePageComplete = () => {
    const spaceState = useStorageComplete();

    useApplyDefaultDisksOnReview();
    useApplyStorageOnReview();
    useStorageSpaceNotification(spaceState.status, spaceState.freeSpace, spaceState.requiredSize);

    if (spaceState.status === StorageCompleteStatus.PENDING) {
        return undefined;
    }
    if (spaceState.status === StorageCompleteStatus.INSUFFICIENT) {
        return false;
    }
    return true;
};
