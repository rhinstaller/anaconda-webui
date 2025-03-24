import cockpit from "cockpit";

const _ = cockpit.gettext;

export const helpEraseAll = () => _("Remove all partitions on the selected devices, including existing operating systems.");

export const helpUseFreeSpace = () => _("Keep current disk layout and use available space, to dual-boot with another OS.");

export const helpMountPointMapping = () => _("Assign partitions to mount points. Useful for pre-configured custom layouts.");

export const helpHomeReuse = () => _("Replace current installation, but keep files in home.");

export const helpConfiguredStorage = () => _("Storage is based on the configuration from 'Modify storage'.");
