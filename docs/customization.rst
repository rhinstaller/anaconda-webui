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

The Installer Web UI can be customized to match your distribution's visual identity through branding. Cockpit provides branding files per distribution variant, located in the `Cockpit repository <https://github.com/cockpit-project/cockpit/tree/main/src/branding/>`_. The Installer Web UI utilizes these Cockpit branding files and adds anaconda-specific branding through the ``.anaconda`` CSS class wrapper in your distribution's Cockpit ``branding.css`` file.

We propose using the following template, which defines three brand color variables:

- ``--brand-default`` - Primary brand color (used in light theme and hover states in dark theme)
- ``--brand-default-light`` - Lighter variant (used in dark theme)
- ``--brand-default-dark`` - Darker variant (used for hover states in light theme)

Example branding CSS:

.. code-block:: css

   .anaconda {
       /* Brand palette */
       --brand-default-light: #51a2da;
       --brand-default: #3c6eb4;
       --brand-default-dark: #294172;

       .logo {
           background-image: url("logo.png");
       }
   }

   :not(.pf-v6-theme-dark) .anaconda {
       /* Default (light theme) token mapping */
       --pf-t--global--color--brand--default: var(--brand-default);
       --pf-t--global--color--brand--hover: var(--brand-default-dark);
   }

   .pf-v6-theme-dark .anaconda {
       /* Dark theme token mapping */
       --pf-t--global--color--brand--default: var(--brand-default-light);
       --pf-t--global--color--brand--hover: var(--brand-default);
   }

The CSS file is imported as-is, so you can add whatever customizations you want through CSS.

Logos are automatically detected and symlinked from system directories during package installation. You only need to reference ``logo.png`` in your CSS using ``background-image: url("logo.png")``. The build system will create the appropriate symlinks.

See the `Fedora branding example <https://github.com/cockpit-project/cockpit/blob/main/src/branding/fedora/branding.css>`_ for a complete reference implementation that you can use as a template.

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

Default web browser
^^^^^^^^^^^^^^^^^^^

The default browser is set using the ``webui_web_engine`` option in the ``[User Interface]`` section of configuration files.

Example configuration:

.. code-block:: ini

   [User Interface]
   # The default browser for the Web UI.
   webui_web_engine = firefox

The value can be either an executable name available in ``$PATH`` (e.g., ``firefox``) or an absolute path to the executable (e.g., ``/usr/bin/firefox``).

**Important**: When changing the default browser, ensure that the specified browser is available in the installation environment. This typically means adding the browser package to your custom Live image or boot ISO.

Example use case
''''''''''''''''

The default browser for Fedora is `Slitherer <https://gitlab.com/VelocityLimitless/Projects/slitherer>`_. Fedora Workstation overrides this to use Firefox, while Fedora KDE uses Slitherer (inherited from the base Fedora profile). See the respective profile files:

- `anaconda/data/profile.d/fedora-workstation.conf <https://github.com/rhinstaller/anaconda/blob/main/data/profile.d/fedora-workstation.conf>`_
- `anaconda/data/profile.d/fedora.conf <https://github.com/rhinstaller/anaconda/blob/main/data/profile.d/fedora.conf>`_

Future: Add-on Support
-----------------------

Add-on support for the Installer Web UI is planned but not yet implemented. This will allow extending the Web UI with custom functionality.

For tracking this feature, see `INSTALLER-2958 <https://issues.redhat.com/browse/INSTALLER-2958>`_.
