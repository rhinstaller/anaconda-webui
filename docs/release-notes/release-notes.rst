Release notes Web UI
====================

This document describes major Anaconda Web UI changes in Fedora releases.

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
