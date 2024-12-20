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

import React, { useContext, useEffect, useState } from "react";
import {
    Flex,
    Label,
    PageSection, PageSectionVariants,
    Popover, PopoverPosition,
    Text, TextContent, TextVariants
} from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";

import { getIsFinal } from "../apis/runtime";

import { NetworkContext } from "../contexts/Common.jsx";

import { HeaderKebab } from "./HeaderKebab.jsx";

import "./AnacondaHeader.scss";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const AnacondaHeader = ({ currentStepId, dispatch, isFormDisabled, onCritFail, reportLinkURL, setShowStorage, showStorage, title }) => {
    const [beta, setBeta] = useState();
    const network = useContext(NetworkContext);
    const isConnected = network.connected;

    useEffect(() => {
        getIsFinal().then(
            isFinal => setBeta(!isFinal),
            onCritFail({ context: N_("Reading installer version information failed.") })
        );
    }, [onCritFail]);

    return (
        <PageSection variant={PageSectionVariants.light}>
            <Flex spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsCenter" }}>
                <img src="./logo.svg" className="logo" />
                <TextContent>
                    <Text component="h1">{title}</Text>
                </TextContent>
                {beta && <Beta />}
                <HeaderKebab
                  currentStepId={currentStepId}
                  dispatch={dispatch}
                  isConnected={isConnected}
                  isFormDisabled={isFormDisabled}
                  onCritFail={onCritFail}
                  reportLinkURL={reportLinkURL}
                  setShowStorage={setShowStorage}
                  showStorage={showStorage}
                />
            </Flex>
        </PageSection>
    );
};

const Beta = () => {
    const prerelease = _("Pre-release");

    return (
        <Popover
          headerContent={_("This is unstable, pre-release software")}
          minWidth="30rem"
          position={PopoverPosition.auto}
          bodyContent={
              <TextContent>
                  <Text component={TextVariants.p}>
                      {_("Notice: This is pre-released software that is intended for development and testing purposes only. Do NOT use this software for any critical work or for production environments.")}
                  </Text>
                  <Text component={TextVariants.p}>
                      {_("By continuing to use this software, you understand and accept the risks associated with pre-released software, that you intend to use this for testing and development purposes only and are willing to report any bugs or issues in order to enhance this work.")}
                  </Text>
                  <Text component={TextVariants.p}>
                      {_("If you do not understand or accept the risks, then please exit this program.")}
                  </Text>
              </TextContent>
          }
        >
            <Label color="orange" icon={<InfoCircleIcon />} id="betanag-icon" onClick={() => {}}> {prerelease} </Label>
        </Popover>
    );
};
