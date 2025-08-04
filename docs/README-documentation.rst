Documentation Generation System
=================================

Overview
--------

This system automatically generates comprehensive documentation for Anaconda
Web UI. The generated documentation is ready for readthedocs.io integration and
includes complete information about the installation flow.

Usage
-----

Generate Documentation
~~~~~~~~~~~~~~~~~~~~~~~

To generate/update all documentation:

.. code-block:: bash

   make docs

This generates:

- ``docs/installation-steps.rst`` - Complete installation guide including all pages and storage scenarios

Continuous Integration
----------------------

A GitHub Action (``.github/workflows/docs-check.yml``) automatically verifies that documentation stays up-to-date with code changes.

Contributing
------------

When adding new scenarios or pages:

1. Add JSDoc ``@description`` comments in page or scenario file
2. Run ``make docs`` to update documentation

CI will automatically verify that documentation stays current with code changes.
