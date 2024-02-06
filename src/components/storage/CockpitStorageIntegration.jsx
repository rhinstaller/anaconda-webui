/*
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
    HelperTextItem,
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
import React, { useState } from "react";

import {
    Alert,
    Button,
    Card,
    CardBody,
    Flex,
    FlexItem,
    List,
    ListItem,
    PageSection,
    PageSectionVariants,
    Text,
    TextContent,
    Title,
} from "@patternfly/react-core";
import { ArrowLeftIcon } from "@patternfly/react-icons";

import { useRequiredSize, useMountPointConstraints } from "./Common.jsx";

import {
    runStorageTask,
    scanDevicesWithTask,
} from "../../apis/storage.js";

import { getDevicesAction } from "../../actions/storage-actions.js";

import "./CockpitStorageIntegration.scss";

const _ = cockpit.gettext;
const idPrefix = "cockpit-storage-integration";

const ReturnToInstallationButton = ({ dispatch, setShowStorage, onCritFail }) => {
    const [isInProgress, setIsInProgress] = useState(false);

    const rescanStorage = () => {
        setIsInProgress(true);

        return scanDevicesWithTask()
                .then(task => {
                    return runStorageTask({
                        task,
                        onSuccess: () => dispatch(getDevicesAction())
                                .then(() => {
                                    setIsInProgress(false);
                                    setShowStorage(false);
                                }),
                        onFail: exc => {
                            setIsInProgress(false);
                            onCritFail()(exc);
                        }
                    });
                });
    };

    return (
        <Button
          icon={<ArrowLeftIcon />}
          id={idPrefix + "-return-to-installation-button"}
          isLoading={isInProgress}
          isDisabled={isInProgress}
          variant="secondary"
          onClick={rescanStorage}>
            {_("Return to installation")}
        </Button>
    );
};

export const CockpitStorageIntegration = ({
    dispatch,
    onCritFail,
    setShowStorage,
}) => {
    return (
        <>
            <PageSection
              stickyOnBreakpoint={{ default: "top" }}
              variant={PageSectionVariants.light}
            >
                <Flex spaceItems={{ default: "spaceItemsLg" }}>
                    <Title headingLevel="h1" size="2xl">{_("Configure storage")}</Title>
                    <Alert
                      isInline
                      isPlain
                      title={_("Changes made here will immediately affect the system. There is no 'undo'.")}
                      variant="warning"
                    />
                </Flex>
            </PageSection>
            <div className={idPrefix + "-page-section-cockpit-storage"}>
                <PageSection>
                    <iframe
                      src="/cockpit/@localhost/storage/index.html"
                      name="cockpit-storage"
                      className={idPrefix + "-iframe-cockpit-storage"} />
                </PageSection>
                <ModifyStorageSideBar />
            </div>
            <PageSection
              className={idPrefix + "-page-section-storage-footer"}
              stickyOnBreakpoint={{ default: "bottom" }}
              variant={PageSectionVariants.light}
            >
                <ReturnToInstallationButton
                  dispatch={dispatch}
                  onCritFail={onCritFail}
                  setShowStorage={setShowStorage}
                />
            </PageSection>
        </>
    );
};

const ModifyStorageSideBar = () => {
    const mountPointConstraints = useMountPointConstraints();
    const requiredSize = useRequiredSize();

    if (mountPointConstraints === undefined) {
        return null;
    }

    const requiredConstraints = (
        mountPointConstraints.filter(constraint => constraint.required.v)
    );
    const recommendedConstraints = (
        mountPointConstraints.filter(constraint => !constraint.required.v && constraint.recommended.v)
    );
    const getConstraints = constraints => (
        <List className={idPrefix + "-requirements-hint-list"}>
            {constraints.map(constraint => {
                const item = [
                    constraint["mount-point"].v,
                    constraint["required-filesystem-type"].v
                ]
                        .filter(c => !!c)
                        .join(" ");

                return <ListItem key={item}>{item}</ListItem>;
            })}
        </List>
    );

    const requiredConstraintsSection = (
        requiredConstraints.length > 0 &&
        <>
            <Text component="p" className={idPrefix + "-requirements-hint"}>
                {_("If you are configuring partitions the following are required:")}
            </Text>
            {getConstraints(requiredConstraints)}
        </>
    );
    const recommendedConstraintsSection = (
        recommendedConstraints.length > 0 &&
        <>
            <Text component="p" className={idPrefix + "-requirements-hint"}>
                {_("Recommended partitions:")}
            </Text>
            {getConstraints(recommendedConstraints)}
        </>
    );

    return (
        <PageSection className={idPrefix + "-sidebar"}>
            <Card>
                <CardBody>
                    <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsLg" }}>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Requirements")}</Title>
                            <TextContent>
                                <Text component="p" className={idPrefix + "-requirements-hint"}>
                                    {cockpit.format(_("Fedora linux requires at least $0 of disk space."), cockpit.format_bytes(requiredSize))}
                                </Text>
                                <Text component="p" className={idPrefix + "-requirements-hint-detail"}>
                                    {_("You can either free up enough space here and let the installer handle the rest or manually set up partitions.")}
                                </Text>
                            </TextContent>
                        </FlexItem>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Partitions (advanced)")}</Title>
                            <TextContent>
                                {requiredConstraintsSection}
                                {recommendedConstraintsSection}
                            </TextContent>
                        </FlexItem>
                    </Flex>
                </CardBody>
            </Card>
        </PageSection>
    );
};
