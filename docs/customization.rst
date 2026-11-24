Customizing the Installer Web UI
=================================

This document describes how distributions and derivatives (such as Bazzite and Bluefin) can customize the Installer Web UI to match their branding and requirements.

Customization can be broadly categorized into two areas:

- **Branding and chroming** - Changing the visual appearance and naming without changing behavior (see :ref:`branding-and-chroming`)
- **Changing installer behavior** - Modifying defaults and functionality through configuration files (see :ref:`changing-installer-behavior`)

These customizations can be deployed in different ways:

- **Build-time customization**: Changes are part of the image when building your own images or using image building tools (e.g., Image Builder)
- **Runtime customization**: Changes are provided with a product image at runtime when using existing images (e.g., official RHEL boot ISO or official Fedora boot ISO)

.. _branding-and-chroming:

Branding and Chroming the User Interface
-----------------------------------------

The Installer Web UI can be customized to match your distribution's visual identity through branding. The branding is defined in the distribution's logos package (e.g., ``fedora-logos``). The logos package installs a CSS file that is symlinked into Cockpit's branding directory, making it automatically available to the Installer Web UI through Cockpit's ``branding.css``.

.. note::

   The ``custom_stylesheet`` option in the Anaconda configuration profile is not supported for the Web UI.

The CSS file is imported as-is, so you can add whatever customizations you want through CSS.

See the `Fedora branding in fedora-logos <https://src.fedoraproject.org/rpms/fedora-logos>`_ for a reference implementation.

.. _changing-installer-behavior:

Changing installer behavior through configuration files
-------------------------------------------------------

The installer's behavior and defaults can be customized through Anaconda configuration files. For complete documentation on Anaconda configuration files, see the `Anaconda configuration files documentation <https://anaconda-installer.readthedocs.io/en/latest/developer/configuration-files.html>`_.

Hiding Web UI pages
^^^^^^^^^^^^^^^^^^^^

The Installer Web UI allows you to hide specific installation pages that may not be relevant for your distribution or ISO variant. This is useful when certain steps are handled elsewhere (e.g., by first-boot tools like GNOME Initial Setup).

Pages are hidden using the ``hidden_webui_pages`` option in the ``[User Interface]`` section of configuration files.

Example configuration:

.. code-block:: ini

   [User Interface]
   hidden_webui_pages =
       anaconda-screen-accounts
       anaconda-screen-date-time

Available page IDs
''''''''''''''''''

The following page IDs can be used with ``hidden_webui_pages``:

- ``anaconda-screen-language`` - Installation language and keyboard selection
- ``anaconda-screen-date-time`` - Date, time, and timezone configuration
- ``anaconda-screen-software-selection`` - Package environment selection
- ``anaconda-screen-accounts`` - User account and root password creation

Example use case
''''''''''''''''

In Fedora Workstation, the account creation page is hidden because user account setup is handled by GNOME Initial Setup during first boot. The date and time page is also hidden as it's configured automatically. See `anaconda/data/profile.d/fedora-workstation.conf <https://github.com/rhinstaller/anaconda/blob/main/data/profile.d/fedora-workstation.conf>`_ for a complete example.

Installer web engine
^^^^^^^^^^^^^^^^^^^^

The installation image selects the browser through an RPM provider.
``anaconda-webui`` requires ``anaconda-webui-opener`` and suggests
``anaconda-webui-opener-firefox`` on Fedora. To use a different opener, such as
``anaconda-webui-opener-slitherer``, add it to the comps package group used to
build the image.

A custom opener package must require its browser, provide and conflict with
``anaconda-webui-opener``, and install an executable at
``/usr/bin/anaconda-webui-opener``:

.. code-block:: spec

   Requires: my-installer-browser
   Provides: anaconda-webui-opener
   Conflicts: anaconda-webui-opener

The opener receives the installer URL as a single argument. It runs as the
installer user with a temporary ``HOME`` and the user's ``XDG_RUNTIME_DIR``.
``ANACONDA_WEBUI_MODE`` is ``default`` for boot images or ``live`` for Live
images; treat an unset mode as ``default``. The opener must launch an isolated
browser instance, stay in the foreground until its window closes, and return
a nonzero status on startup failure. Remote installations do not invoke it.

The ``anaconda-webui-browser-ext`` package handles external links on Live
images separately from the installer opener.

.. _cockpit-web-service-configuration:

Cockpit Web Service Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The Installer Web UI runs on Cockpit's web service (``cockpit-ws``). Its configuration lives under an Anaconda-owned path at ``/etc/anaconda/cockpit/`` instead of the default ``/etc/cockpit/`` to prevent installer-specific settings (such as disabled TLS or authentication) from leaking into the installed system.

The base configuration file is ``/etc/anaconda/cockpit/cockpit.conf``. It uses the standard `cockpit.conf(5) <https://cockpit-project.org/guide/latest/cockpit.conf.5.html>`_ INI format.

Default settings:

.. code-block:: ini

   [WebService]
   AllowUnencrypted = true
   LoginTo = false
   AllowMultiHost = false

   [Session]
   IdleTimeout = 0

conf.d drop-in overrides
'''''''''''''''''''''''''

To customize the Cockpit web service for specific environments without modifying the base configuration, place ``*.conf`` files in ``/etc/anaconda/cockpit/conf.d/``. Files are applied in lexicographic order, and later files override values from earlier ones and from the base configuration.

Example -- enable TLS for a network-based installation:

.. code-block:: ini

   # /etc/anaconda/cockpit/conf.d/50-tls.conf
   [WebService]
   AllowUnencrypted = false

Example -- set a custom login title:

.. code-block:: ini

   # /etc/anaconda/cockpit/conf.d/50-branding.conf
   [WebService]
   LoginTitle = My Custom Installer

The merged configuration is written to ``/run/anaconda/cockpit/cockpit.conf`` at service start and is used by ``cockpit-ws`` via the ``XDG_CONFIG_DIRS`` environment variable.

For the full list of available cockpit.conf options, see the `cockpit.conf(5) man page <https://cockpit-project.org/guide/latest/cockpit.conf.5.html>`_.

Future: Add-on Support
-----------------------

Add-on support for the Installer Web UI is planned but not yet implemented. This will allow extending the Web UI with custom functionality.

For tracking this feature, see `INSTALLER-2958 <https://issues.redhat.com/browse/INSTALLER-2958>`_.
