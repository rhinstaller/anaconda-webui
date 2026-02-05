/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext } from "react";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";

import { SystemTypeContext } from "../../contexts/Common.jsx";

import feedbackQRcode from "../../../images/qr-code-feedback.svg";

import "./Feedback.scss";

const _ = cockpit.gettext;

export const Feedback = () => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";

    return (
        <Flex className="feedback-section">
            <img className="feedback-qr-code" src={feedbackQRcode} />
            <Content>
                <Content component="h3">{_("Send us feedback on your installation")}</Content>
                <Content component="p" className="feedback-hint">{_("Scan the QR code with your phone or visit:")}</Content>
                <Content
                  component="a"
                  target={isBootIso ? "_blank" : ""}
                  rel={isBootIso ? "noreferrer" : ""}
                  href={(isBootIso ? "https://" : "extlink://") + "discussion.fedoraproject.org/tag/anaconda"}>
                    https://discussion.fedoraproject.org/tag/anaconda
                </Content>
            </Content>
        </Flex>
    );
};
