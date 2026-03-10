.. Storage partitioning scenarios. Included from installation-method/index.rst.

Storage Partitioning Scenarios
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The Web UI installer provides several storage partitioning scenarios to accommodate different installation needs:

.. figure:: images/storage-scenario-overview.png
   :width: 700px
   :align: center
   :alt: Storage scenarios overview interface

**Use entire disk**

Completely erases all data on the selected disks and automatically creates a new partition layout. Use this for clean installations when you do not need to preserve any existing data.

**Mount point assignment**

Allows you to manually assign mount points to specific devices for complete control over the partition layout. Use this if you have custom storage requirements or want to reuse existing partitions selectively.

.. figure:: images/storage-scenario-mount-point-mapping.png
   :width: 700px
   :align: center
   :alt: Mount point assignment scenario interface

**Reinstall Fedora**

Reinstalls Fedora while preserving your existing home directory and user data. Use when you want to refresh your Fedora installation while keeping all your personal files and settings. This option only appears when exactly one existing Fedora system is detected and the system has only the default mount points.

**Use configured storage**

Uses storage configuration created through the external Cockpit storage editor tool for non-default layouts. This option only appears when you have configured and confirmed a valid storage layout through cockpit-storage.

.. _use-configured-storage-figure:

.. figure:: images/storage-scenario-use-configured-storage.png
   :width: 700px
   :align: center
   :alt: Use configured storage scenario interface

**Use free space**

Installs using only unallocated free space, preserving existing partitions and data. Use when you want to dual-boot with existing operating systems. This option only appears when existing partitions are detected on the selected disks.
