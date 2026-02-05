/*
 * Copyright (C) 2023 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */
import cockpit from "cockpit";

import React, { useContext, useState } from "react";
import { AboutModal } from "@patternfly/react-core/dist/esm/components/AboutModal/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { DescriptionList, DescriptionListDescription, DescriptionListTerm } from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { Dropdown, DropdownItem, DropdownList } from "@patternfly/react-core/dist/esm/components/Dropdown/index.js";
import { MenuToggle } from "@patternfly/react-core/dist/esm/components/MenuToggle/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Stack, StackItem } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";
import { EllipsisVIcon } from "@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon";

import { AppVersionContext, OsReleaseContext, SystemTypeContext } from "../contexts/Common.jsx";

import { UserIssue } from "./Error.jsx";
import { CockpitNetworkConfiguration } from "./network/CockpitNetworkConfiguration.jsx";
import { CockpitStorageIntegration, ModifyStorage } from "./storage/cockpit-storage-integration/CockpitStorageIntegration.jsx";

import "./HeaderKebab.scss";

const _ = cockpit.gettext;

const AboutModalVersions = () => {
    const version = useContext(AppVersionContext);

    return (
        <DescriptionList isHorizontal id="about-modal-versions">
            <DescriptionListTerm id="backend-dt">Anaconda</DescriptionListTerm>
            <DescriptionListDescription id="backend-dd">{version.backend}</DescriptionListDescription>
            <DescriptionListTerm id="webui-dt">Anaconda WebUI</DescriptionListTerm>
            <DescriptionListDescription id="webui-dd">{version.webui}</DescriptionListDescription>
        </DescriptionList>
    );
};

const ProductName = () => {
    const osRelease = useContext(OsReleaseContext);

    return (
        <Stack hasGutter>
            <StackItem id="about-modal-title" className="title">{cockpit.format(_("$0 installer"), osRelease.PRETTY_NAME)}</StackItem>
            <StackItem id="about-modal-subtitle" className="subtitle">{_("Powered by Anaconda")}</StackItem>
        </Stack>
    );
};

const AnacondaAboutModal = ({ isModalOpen, setIsAboutModalOpen }) => {
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";
    const toggleModal = () => {
        setIsAboutModalOpen(!isModalOpen);
    };

    return (
        <AboutModal
          id="about-modal"
          isOpen={isModalOpen}
          onClose={toggleModal}
          productName={<ProductName />}
          variant="small"
        >
            <Flex direction={{ default: "column" }} justifyContent={{ default: "justifyContentSpaceBetween" }}>
                <AboutModalVersions />
                <Button
                  isInline
                  id="anaconda-page-button"
                  variant="link"
                  icon={<ExternalLinkAltIcon />}
                  href={(isBootIso ? "https://" : "extlink://") + "github.com/rhinstaller/anaconda"}
                  target={isBootIso ? "_blank" : ""}
                  component="a">
                    {_("Anaconda project page")}
                </Button>
            </Flex>
        </AboutModal>
    );
};

export const HeaderKebab = ({ currentStepId, dispatch, isConnected, onCritFail, reportLinkURL, setShowStorage, showStorage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);
    const [isNetworkOpen, setIsNetworkOpen] = useState(false);
    const isBootIso = useContext(SystemTypeContext).systemType === "BOOT_ISO";

    const onToggle = () => {
        setIsOpen(!isOpen);
    };
    const onSelect = () => {
        setIsOpen(false);
    };

    const handleAboutModal = () => {
        setIsAboutModalOpen(true);
    };

    const handleReportIssue = () => {
        setIsReportIssueOpen(true);
    };

    const handleNetwork = () => {
        setIsNetworkOpen(true);
    };

    const dropdownItems = [
        ...(isBootIso
            ? [
                <DropdownItem id="about-modal-dropdown-item-network" key="network" onClick={handleNetwork}>
                    {_("Configure network")}
                </DropdownItem>
            ]
            : []
        ),
        <ModifyStorage
          currentStepId={currentStepId}
          key="modify-storage"
          setShowStorage={setShowStorage}
        />,
        <DropdownItem id="about-modal-dropdown-item-about" key="about" onClick={handleAboutModal}>
            {_("About")}
        </DropdownItem>,
        <DropdownItem id="about-modal-dropdown-item-report" key="report issue" onClick={handleReportIssue}>
            {_("Report Issue")}
        </DropdownItem>,
    ];

    return (
        <>
            <Dropdown
              isOpen={isOpen}
              onSelect={onSelect}
              popperProps={{ position: "right" }}
              onOpenChange={setIsOpen}
              toggle={toggleRef =>
                  <MenuToggle
                    className="pf-m-align-right"
                    icon={<EllipsisVIcon />}
                    id="toggle-kebab"
                    isExpanded={isOpen}
                    onClick={onToggle}
                    ref={toggleRef}
                    variant="plain" />}
              shouldFocusToggleOnSelect>
                <DropdownList>
                    {dropdownItems}
                </DropdownList>
            </Dropdown>
            {isNetworkOpen &&
            <CockpitNetworkConfiguration
              setIsNetworkOpen={setIsNetworkOpen}
              onCritFail={onCritFail}
            />}
            {isAboutModalOpen &&
                <AnacondaAboutModal
                  isModalOpen={isAboutModalOpen}
                  setIsAboutModalOpen={setIsAboutModalOpen}
                />}
            {isReportIssueOpen &&
                <UserIssue
                  reportLinkURL={reportLinkURL}
                  setIsReportIssueOpen={setIsReportIssueOpen}
                  isConnected={isConnected}
                />}
            {showStorage &&
            <CockpitStorageIntegration
              dispatch={dispatch}
              onCritFail={onCritFail}
              setShowStorage={setShowStorage}
            />}
        </>
    );
};
