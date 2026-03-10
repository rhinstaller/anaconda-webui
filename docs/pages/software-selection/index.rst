.. This page is included from docs/installation-steps.rst.

Software selection
------------------

.. figure:: images/step-software-selection.png
   :width: 700px
   :align: center
   :alt: Software selection

The Software selection screen allows you to choose a *Base Environment* and *Add-ons*. These options control which software packages will be installed on your system during the installation process.

This screen is only available if the installation source is properly configured and only after the installer has loaded package metadata from the source.

.. note::
   It is not possible to select specific packages during a manual installation. You can only select pre-defined environments and add-ons. If you need to control exactly which packages are installed, use a Kickstart file and define the packages in the ``%packages`` section.

The availability of environments and add-ons depends on your installation source. By default, the selection depends on the installation media you used to start the installation; different images (e.g. Server, Workstation) have different environments and add-ons available.

To configure your software selection, first choose an environment on the left side of the screen. Only one environment can be chosen, even if more are available. Then, on the right side, select one or more add-ons that you want to install. The list of add-ons may be divided into those that are part of your chosen environment and those that are not specific to it.

After you finish configuring your software selection, confirm to proceed.
