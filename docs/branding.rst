========
Branding
========

The Anaconda Web UI supports automatic branding based on the operating system to provide distribution-specific visual themes while maintaining a consistent user experience.

Overview
========

The branding system automatically detects the operating system from ``/etc/os-release`` and applies appropriate styling:

- **Automatic distribution detection**: Based on ``ID`` field in ``/etc/os-release``
- **PatternFly defaults**: Default appearance for distributions without specific branding

Supported Distributions
=======================

Built-in Branding
-----------------

- **Fedora**
- **Bazzite**
- **Bluefin**

**Important**: Fedora-based remixes (like Bazzite, Nobara) are intentionally **not** detected as Fedora to allow them to use their own distinct branding.

Adding New Distribution Branding
=================================

To add complete branding (colors + logo) for a new distribution (e.g., Bazzite, Nobara):

1. **Create the SCSS file**: Add ``src/branding/{distro}.scss``

   .. code-block:: scss

      :root {
        /* Your distribution's brand colors */
        --distro-primary: #color;
        --distro-secondary: #color;
      }

      body {
        --pf-t--global--color--brand--default: var(--distro-primary);
        /* ... additional overrides ... */
      }
