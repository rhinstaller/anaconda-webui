.. This page is included from docs/installation-steps.rst. Shown only for "Mount point assignment" scenario.

Manual disk configuration
--------------------------

.. figure:: images/storage-scenario-mount-point-mapping.png
   :width: 700px
   :align: center
   :alt: Manual disk configuration (mount point assignment)

The Manual disk configuration screen allows you to assign mount points (such as ``/``, ``/home``, ``/boot``) to existing partitions. All partitions that will be used for the installation must already exist so that they appear for selection on this screen. To create or change the partition layout (physical volumes, volume groups, logical volumes, or standard partitions), use **Cockpit storage** before or alongside the installer; the Web UI installer does not create or modify partitions, it only assigns mount points to partitions that are already present. Alternatively, choose the **Use configured storage** scenario on the Installation method screen to use a layout you created in Cockpit storage; that scenario is described in the Installation method section (see the interface shown in :ref:`use-configured-storage-figure`).

On this screen, select each partition and assign it a mount point. You can adjust which mount point uses which partition until the layout matches your needs. Some mount points have restrictions: for example, ``/boot`` typically must be on a standard partition. The installer will report any errors in your configuration so you can correct them before proceeding.

.. note::
   No permanent changes are made to your disks until you start the installation. The assignment you set here is only applied when you begin the installation on the Review and install screen.

After you finish assigning mount points, confirm to proceed to the next step.
