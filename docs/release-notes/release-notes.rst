Release notes Web UI
====================

This document describes major Anaconda Web UI changes in Fedora releases.

Fedora 45
#########

Remote installation (tech preview)
-----------------------------------

Web-based remote installation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Fedora Atomic Desktop editions now support secure remote installation through a web
browser. By booting the ISO with ``inst.webui.remote`` and
``inst.webui.remote.password=<PIN>``, the installer becomes accessible over HTTPS from
any device on the network. The installer generates self-signed TLS certificates and
presents a PIN-based login page for authentication.

See also:
    - https://fedoraproject.org/wiki/Changes/Web_Based_Remote_Installation_Support_For_Atomic_Desktops
    - https://issues.redhat.com/browse/INSTALLER-3373
    - https://github.com/rhinstaller/anaconda-webui/pull/1409
    - https://github.com/rhinstaller/anaconda-webui/pull/1413

Network
-------

Network configuration wizard page
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

A dedicated Network Configuration page has been added to the installation wizard,
between the Language and Date/Time steps. The page embeds the Cockpit NetworkManager
interface, making network configuration more discoverable than the previous kebab
menu entry.

See also:
    - https://issues.redhat.com/browse/INSTALLER-4650
    - https://github.com/rhinstaller/anaconda-webui/pull/1225

Storage
-------

Stratis storage support
^^^^^^^^^^^^^^^^^^^^^^^

The Web UI now supports Stratis storage, including encrypted Stratis pools, in the
advanced storage interface. Stratis devices are properly displayed on the review screen
and home directory reuse partitioning works with Stratis layouts.

See also:
    - https://github.com/rhinstaller/anaconda-webui/pull/1376
    - https://github.com/rhinstaller/anaconda-webui/pull/1373
    - https://github.com/rhinstaller/anaconda-webui/pull/1421

Storage editor moved to Installation Method
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The cockpit-storage editor entry point has been moved from the header kebab menu to
the Installation Method page, making it more discoverable.

See also:
    - https://issues.redhat.com/browse/INSTALLER-4655
    - https://github.com/rhinstaller/anaconda-webui/pull/1407

Storage validation warnings
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Storage validation now surfaces both warnings and errors consistently across all
partitioning flows (mount point mapping, disk encryption, installation method).

See also:
    - https://issues.redhat.com/browse/INSTALLER-4700
    - https://github.com/rhinstaller/anaconda-webui/pull/1273

Kickstart support
-----------------

Kickstart installation support
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The Web UI now supports kickstart-driven installations. When a kickstart file is
provided, the installer opens directly on the review page and automatically proceeds
to installation once all validations pass.
The review page alerts users when configuration is incomplete, linking to the first
incomplete step.

Kickstart-specified users, root accounts, timezone, NTP servers, and language are
properly loaded and displayed in the Web UI.

Note: for remote installations (``inst.webui.remote``), the Web UI interface must be
accessed at least once for the installation to start.

Non-critical installation errors (such as missing kickstart packages) are handled
with a modal dialog, allowing the user to continue or abort instead of failing the
entire installation.

Other
-----

Reboot button on live media
^^^^^^^^^^^^^^^^^^^^^^^^^^^

A "Reboot" button is now shown on the post-installation screen for live media
installations, in addition to the existing "Exit to live desktop" option.

See also:
    - https://bugzilla.redhat.com/show_bug.cgi?id=2326672
    - https://github.com/rhinstaller/anaconda-webui/pull/1367

Bugzilla duplicate detection
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The error reporting dialog now searches for similar open bugs before submitting a new
report, helping users attach information to existing issues instead of creating
duplicates.

See also:
    - https://github.com/rhinstaller/anaconda-webui/pull/1394


Fedora 44
#########

Keyboard and localization
-------------------------

Multiple keyboard layouts on Workstation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Multiple keyboard layouts can be selected on Workstation, similar to non-GNOME
variants. This is needed for many languages (for example, Russian with the
Cyrillic alphabet).

Sensible keyboard defaults with language selection
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When you choose a language, the installer suggests matching keyboard defaults
on non-GNOME systems. On Workstation ISO, keyboard layout is not set
automatically according to language selection; use GNOME’s keyboard settings to
add or switch layouts if needed.

See also:
    - https://bugzilla.redhat.com/show_bug.cgi?id=2402459

Storage
-------

Validation warnings for automatic partitioning
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When automatic partitioning is selected, the Web UI can show validation warnings
when the chosen setup may need attention. These are warnings, not errors: the
user can ignore them and continue if they want. For example, when choosing to
share the disk with another OS, if the existing EFI partition is smaller than
the recommended size of 1 GiB, a warning is shown so the user is aware before
proceeding.

Other
-----

Improvements in error reporting
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The error reporting dialog now supports a flow that uses a Bugzilla API key to
register and automatically upload the needed logs. Stack traces are
automatically included in reports with readable source-mapped output. Users can
also restrict the report to a limited group.
