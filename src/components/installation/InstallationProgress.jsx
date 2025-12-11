/*
 * Copyright (C) 2022 Red Hat, Inc.
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

import React, { useContext, useEffect, useRef, useState } from "react";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { ProgressStep, ProgressStepper } from "@patternfly/react-core/dist/esm/components/ProgressStepper/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { CheckCircleIcon } from "@patternfly/react-icons/dist/esm/icons/check-circle-icon";
import { ExclamationCircleIcon } from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon";
import { InProgressIcon } from "@patternfly/react-icons/dist/esm/icons/in-progress-icon";
import { PendingIcon } from "@patternfly/react-icons/dist/esm/icons/pending-icon";

import { BossClient, getSteps, installWithTasks } from "../../apis/boss.js";

import { exitGui } from "../../helpers/exit.js";

import { OsReleaseContext, SystemTypeContext } from "../../contexts/Common.jsx";

import { EmptyStatePanel } from "cockpit-components-empty-state.jsx";

import { Feedback } from "./Feedback.jsx";

import "./InstallationProgress.scss";

const _ = cockpit.gettext;
const N_ = cockpit.noop;
const SCREEN_ID = "anaconda-screen-progress";

const progressStepsMap = {
    BOOTLOADER_INSTALLATION: 2,
    ENVIRONMENT_CONFIGURATION: 0,
    SOFTWARE_INSTALLATION: 1,
    STORAGE_CONFIGURATION: 0,
    SYSTEM_CONFIGURATION: 3,
};

export const InstallationProgress = ({ onCritFail }) => {
    const [status, setStatus] = useState();
    const [statusMessage, setStatusMessage] = useState("");
    const [steps, setSteps] = useState();
    const [currentProgressStep, setCurrentProgressStep] = useState(0);
    const refStatusMessage = useRef("");
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const osRelease = useContext(OsReleaseContext);

    useEffect(() => {
        (async () => {
            try {
                const tasks = await installWithTasks();
                const taskProxy = new BossClient().client.proxy(
                    "org.fedoraproject.Anaconda.Task",
                    tasks[0]
                );
                const categoryProxy = new BossClient().client.proxy(
                    "org.fedoraproject.Anaconda.TaskCategory",
                    tasks[0]
                );

                const addEventListeners = () => {
                    taskProxy.addEventListener("ProgressChanged", async (_, step, message) => {
                        if (step === 0) {
                            try {
                                const ret = await getSteps({ task: tasks[0] });
                                setSteps(ret.v);
                            } catch (error) {
                                onCritFail()(error);
                            }
                        }
                        if (message) {
                            setStatusMessage(message);
                            refStatusMessage.current = message;
                        }
                    });
                    taskProxy.addEventListener("Failed", () => {
                        setStatus("danger");
                    });
                    taskProxy.addEventListener("Stopped", async () => {
                        try {
                            await taskProxy.Finish();
                        } catch (error) {
                            onCritFail({
                                context: cockpit.format(N_("Installation of the system failed: $0"), refStatusMessage.current),
                            })(error);
                        }
                    });
                    categoryProxy.addEventListener("CategoryChanged", (_, category) => {
                        const step = progressStepsMap[category];
                        setCurrentProgressStep(current => {
                            if (step !== undefined && step >= current) {
                                return step;
                            }
                            return current;
                        });
                    });
                    taskProxy.addEventListener("Succeeded", () => {
                        setStatus("success");
                        setCurrentProgressStep(4);
                    });
                };
                taskProxy.wait(() => {
                    addEventListeners();
                    (async () => {
                        try {
                            await taskProxy.Start();
                        } catch (error) {
                            onCritFail({
                                context: _("Installation of the system failed"),
                            })(error);
                        }
                    })();
                });
            } catch (error) {
                onCritFail({
                    context: _("Installation of the system failed"),
                })(error);
            }
        })();
    }, [onCritFail]);

    if (steps === undefined) {
        return null;
    }

    let icon;
    let title;
    if (status === "success") {
        icon = CheckCircleIcon;
        title = _("Successfully installed");
    } else if (status === "danger") {
        icon = ExclamationCircleIcon;
        title = _("Installation failed");
    } else {
        title = _("Installing");
    }

    const progressSteps = [
        {
            description: _("Storage configuration: Storage is currently being configured."),
            id: SCREEN_ID + "-step-storage",
            title: _("Storage configuration"),
        },
        {
            description: _("Software installation: Storage configuration complete. The software is now being installed onto your device."),
            id: SCREEN_ID + "-step-payload",
            title: _("Software installation"),
        },
        {
            description: _("System configuration: Software installation complete. The system is now being configured."),
            id: SCREEN_ID + "-step-configuration",
            title: _("System configuration"),
        },
        {
            description: _("Finalizing: The system configuration is complete. Finalizing installation may take a few moments."),
            id: SCREEN_ID + "-step-boot-loader",
            title: _("Finalization"),
        },
    ];

    return (
        <Flex direction={{ default: "column" }} className={SCREEN_ID + "-status " + SCREEN_ID + "-status-" + status}>
            <EmptyStatePanel
              icon={icon}
              isFullHeight
              loading={!icon}
              variant="full"
              paragraph={
                  <Flex direction={{ default: "column" }}>
                      <Content component="p">
                          {currentProgressStep < 4
                              ? progressSteps[currentProgressStep].description
                              : cockpit.format(_("To begin using $0, reboot your system."), osRelease.PRETTY_NAME)}
                      </Content>
                      {currentProgressStep < 4 && (
                          <>
                              <FlexItem spacer={{ default: "spacerXl" }} />
                              <ProgressStepper isCenterAligned>
                                  {progressSteps.map((progressStep, index) => {
                                      let variant = "pending";
                                      let ariaLabel = _("pending step");
                                      let phaseText = _("Pending");
                                      let statusText = "";
                                      let phaseIcon = <PendingIcon />;
                                      if (index < currentProgressStep) {
                                          variant = "success";
                                          ariaLabel = _("completed step");
                                          phaseText = _("Completed");
                                          phaseIcon = <CheckCircleIcon />;
                                      } else if (index === currentProgressStep) {
                                          variant = status === "danger" ? status : "info";
                                          ariaLabel = _("current step");
                                          phaseText = _("In progress");
                                          statusText = statusMessage;
                                          if (status === "danger") {
                                              phaseIcon = <ExclamationCircleIcon />;
                                          } else {
                                              phaseIcon = <InProgressIcon />;
                                          }
                                      }
                                      return (
                                          <ProgressStep
                                            aria-label={ariaLabel}
                                            id={SCREEN_ID + "-step-" + index}
                                            isCurrent={index === currentProgressStep}
                                            icon={phaseIcon}
                                            titleId={progressStep.id}
                                            key={index}
                                            variant={variant}
                                            description={
                                                <Flex direction={{ default: "column" }}>
                                                    <FlexItem spacer={{ default: "spacerNone" }}>
                                                        <Content component="p">{phaseText}</Content>
                                                    </FlexItem>
                                                    <FlexItem spacer={{ default: "spacerNone" }}>
                                                        <Content component="p">{statusText}</Content>
                                                    </FlexItem>
                                                </Flex>
                                            }
                                          >
                                              {progressStep.title}
                                          </ProgressStep>
                                      );
                                  })}
                              </ProgressStepper>
                          </>)}
                  </Flex>
              }
              secondary={
                  status === "success" &&
                  <Button onClick={exitGui}>{isBootIso ? _("Reboot to installed system") : _("Exit to live desktop")}</Button>
              }
              title={title}
              headingLevel="h2"
            />
            {(status === "success" || status === "danger") && <Feedback />}
        </Flex>
    );
};
