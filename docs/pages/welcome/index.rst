.. This page is included from docs/installation-steps.rst.

Welcome Screen and Language Selection
--------------------------------------
.. _welcome:

.. figure:: images/step-language.png
   :width: 700px
   :align: center
   :alt: Welcome (language selection)

The first screen displayed after the Web UI installer starts is the Welcome screen.

The language you select on this screen will be used during the installation, and it will also be used on the installed system by default. You can change the language for the installed system later, but once you confirm and leave this screen, you will not be able to go back and change the language used inside the installer itself.

One language is pre-selected by default. If network access is configured at this point (for example, if you booted from a network server instead of local media), the pre-selected language may be determined based on automatic location detection. Alternatively, if you used the ``inst.lang=`` option on the boot command line or in your PXE configuration, that language will be selected by default, but you can still change it.

After you select your language and locale, confirm your selection to proceed to the next step.
