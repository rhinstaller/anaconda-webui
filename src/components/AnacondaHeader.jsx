/*
 * Copyright (C) 2022 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext, useEffect, useState } from "react";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Popover, PopoverPosition } from "@patternfly/react-core/dist/esm/components/Popover/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { InfoCircleIcon } from "@patternfly/react-icons/dist/esm/icons/info-circle-icon";

import { getIsFinal } from "../apis/runtime.js";

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
        <PageSection hasBodyWrapper={false}>
            <Flex spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsCenter" }}>
                <div className="logo" />
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
