import cockpit from "cockpit";

const _ = cockpit.gettext;

export const helpEraseAll = _("Remove all partitions on the selected devices, including existing operating systems. Make sure you have backed up your data.");

export const helpUseFreeSpace = _("Keep current disk layout and only install into available space.");

export const helpMountPointMapping = _("Manually select storage locations for installation.");

export const helpHomeReuse = _("Reuse /home partition and reinstall root and boot partitions.");

export const helpConfiguredStorage = _("Storage is based on the configuration from 'Modify storage'.");
