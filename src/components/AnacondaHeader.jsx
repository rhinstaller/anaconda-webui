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
    Content, ContentVariants,
    Flex,
    Label,
    PageSection, Popover, PopoverPosition
} from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";

import { getIsFinal } from "../apis/runtime";

import { getLogoPath } from "../helpers/branding.js";

import { NetworkContext, OsReleaseContext } from "../contexts/Common.jsx";

import { HeaderKebab } from "./HeaderKebab.jsx";

import "./AnacondaHeader.scss";

const _ = cockpit.gettext;
const N_ = cockpit.noop;

export const AnacondaHeader = ({ currentStepId, dispatch, isFormDisabled, onCritFail, reportLinkURL, setShowStorage, showStorage, title }) => {
    const [beta, setBeta] = useState();
    const network = useContext(NetworkContext);
    const osRelease = useContext(OsReleaseContext);
    const isConnected = network.connected;

    useEffect(() => {
        getIsFinal().then(
            isFinal => setBeta(!isFinal),
            onCritFail({ context: N_("Reading installer version information failed.") })
        );
    }, [onCritFail]);

    // Get the appropriate logo path based on the distribution
    const logoPath = getLogoPath(osRelease);
    const logoAlt = osRelease?.PRETTY_NAME ? `${osRelease.PRETTY_NAME} logo` : "Logo";

    return (
        <PageSection hasBodyWrapper={false}>
            <Flex spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsCenter" }}>
                {logoPath && <img src={logoPath} className="logo" alt={logoAlt} />}
                <Content>
                    <Content component="h1">{title}</Content>
                </Content>
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
              <Content>
                  <Content component={ContentVariants.p}>
                      {_("Notice: This is pre-released software that is intended for development and testing purposes only. Do NOT use this software for any critical work or for production environments.")}
                  </Content>
                  <Content component={ContentVariants.p}>
                      {_("By continuing to use this software, you understand and accept the risks associated with pre-released software, that you intend to use this for testing and development purposes only and are willing to report any bugs or issues in order to enhance this work.")}
                  </Content>
                  <Content component={ContentVariants.p}>
                      {_("If you do not understand or accept the risks, then please exit this program.")}
                  </Content>
              </Content>
          }
        >
            <Label color="orange" icon={<InfoCircleIcon />} id="betanag-icon" onClick={() => {}}> {prerelease} </Label>
        </Popover>
    );
};
