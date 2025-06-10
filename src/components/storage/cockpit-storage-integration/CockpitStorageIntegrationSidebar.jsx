/*
 * Copyright (C) 2025 Red Hat, Inc.
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

import React from "react";
import {
    Card,
    CardBody,
    Content,
    Flex,
    FlexItem,
    List,
    ListItem,
    PageSection,
    Title
} from "@patternfly/react-core";

import {
    useMountPointConstraints,
    useRequiredSize,
} from "../../../hooks/Storage.jsx";

const _ = cockpit.gettext;
const idPrefix = "cockpit-storage-integration";

export const ModifyStorageSideBar = () => {
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
            <Content component="p" className={idPrefix + "-requirements-hint"}>
                {_("If you are configuring partitions the following are required:")}
            </Content>
            {getConstraints(requiredConstraints)}
        </>
    );
    const recommendedConstraintsSection = (
        recommendedConstraints.length > 0 &&
        <>
            <Content component="p" className={idPrefix + "-requirements-hint"}>
                {_("Recommended partitions:")}
            </Content>
            {getConstraints(recommendedConstraints)}
        </>
    );

    return (
        <PageSection hasBodyWrapper={false} className={idPrefix + "-sidebar"}>
            <Card>
                <CardBody>
                    <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsLg" }}>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Requirements")}</Title>
                            <Content>
                                <Content component="p" className={idPrefix + "-requirements-hint"}>
                                    {cockpit.format(_("Fedora linux requires at least $0 of disk space."), cockpit.format_bytes(requiredSize))}
                                </Content>
                                <Content component="p" className={idPrefix + "-requirements-hint-detail"}>
                                    {_("You can either free up enough space here and let the installer handle the rest or manually set up partitions.")}
                                </Content>
                            </Content>
                        </FlexItem>
                        <FlexItem>
                            <Title headingLevel="h3" size="lg">{_("Partitions (advanced)")}</Title>
                            <Content>
                                {requiredConstraintsSection}
                                {recommendedConstraintsSection}
                            </Content>
                        </FlexItem>
                    </Flex>
                </CardBody>
            </Card>
        </PageSection>
    );
};
