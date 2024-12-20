/*
 * Copyright (C) 2023 Red Hat, Inc.
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

import React, { useContext } from "react";
import {
    Flex,
    Text,
    TextContent,
} from "@patternfly/react-core";

import feedbackQRcode from "../../../images/qr-code-feedback.svg";
import { SystemTypeContext } from "../../contexts/Common.jsx";

import "./Feedback.scss";

const _ = cockpit.gettext;

export const Feedback = () => {
    const isBootIso = useContext(SystemTypeContext) === "BOOT_ISO";

    return (
        <Flex className="feedback-section">
            <img className="feedback-qr-code" src={feedbackQRcode} />
            <TextContent>
                <Text component="h3">{_("Send us feedback on your installation")}</Text>
                <Text component="p" className="feedback-hint">{_("Scan the QR code with your phone or visit:")}</Text>
                <Text
                  component="a"
                  target={isBootIso ? "_blank" : ""}
                  rel={isBootIso ? "noreferrer" : ""}
                  href={(isBootIso ? "https://" : "extlink://") + "discussion.fedoraproject.org/tag/anaconda"}>
                    https://discussion.fedoraproject.org/tag/anaconda
                </Text>
            </TextContent>
        </Flex>
    );
};
