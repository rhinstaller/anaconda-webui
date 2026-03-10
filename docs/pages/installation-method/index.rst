.. This page is included from docs/installation-steps.rst. Scenarios are in scenarios.rst.

Installation method
-------------------

.. figure:: images/step-method.png
   :width: 700px
   :align: center
   :alt: Installation method

The Installation method screen allows you to configure storage options: which disks will be used as the installation target and which partitioning scenario to apply. At least one disk must be selected for the installation to proceed.

.. note::
   If you plan to use a disk that already contains data (for example, to shrink an existing partition and install alongside another operating system), back up any important data first. Manipulating partitions always carries a risk; if the process is interrupted or fails, data on the disk may become unrecoverable.

In the top part of the screen, locally available storage devices are displayed. Select the disks you want to use for the installation. All selected disks will be used according to the chosen scenario. You can also configure encryption and where the boot loader will be installed.

.. note::
   Removable storage such as USB flash drives will appear in the list. Do **not** select removable storage as an installation target unless you intend to. If you install to a removable drive and then unplug it, the system may become unusable.

After you select the disks and choose a storage scenario (see below), confirm your selection. Depending on your choices, you may be prompted for an encryption passphrase or to review reclaimable space before proceeding.

The following subsection describes the available storage partitioning scenarios.

.. include:: scenarios.rst
