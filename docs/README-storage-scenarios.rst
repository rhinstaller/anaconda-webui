Storage Scenarios Documentation Generation
==========================================

Overview
--------

The storage scenarios are automatically documented by parsing the scenario files in ``src/components/storage/scenarios/`` and extracting metadata from them.

Usage
-----

Generate Documentation
~~~~~~~~~~~~~~~~~~~~~~~

To generate/update the documentation:

.. code-block:: bash

   make docs-scenarios

Integration with readthedocs.io
-------------------------------

The generated ``storage-scenarios.rst`` file is ready for readthedocs.io integration and can be included directly in Sphinx documentation.

Continuous Integration
----------------------

A GitHub Action (``.github/workflows/docs-check.yml``) automatically verifies that documentation stays up-to-date.

Adding New Scenarios
--------------------

To add a new storage scenario:

1. **Create the scenario file** in ``src/components/storage/scenarios/``
2. **Add to the index** in ``src/components/storage/scenarios/index.js``

Example scenario structure:

.. code-block:: javascript

   /**
    * @description Detailed explanation of what this scenario does, how it works,
    * and what happens during the partitioning process.
    */
   export const scenarioExample = {
       buttonVariant: "danger",
       getAvailability: useAvailabilityExample,
       getButtonLabel: () => _("Example Action"),
       getDetail: helpExample,
       getLabel: () => _("Example Scenario"),
       id: "example-scenario",
       initializationMode: 0,
   };
