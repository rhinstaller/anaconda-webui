Test Results Integration with Fedora QA Wiki
============================================

Overview
--------

The **Anaconda Web UI** runs its own upstream test suite daily against latest compose.
These test results are then reported to the **Fedora QA Wiki**, where the Fedora QA team monitors
the health of Fedora composes, ensuring that installation tests meet release criteria.
This integration serves two primary purposes:

1. **Reduce Work Duplication**: By reporting upstream test results to Fedora QA, we reduce the
   duplication of testing efforts.
2. **Improve Collaboration**: It fosters collaboration between the Anaconda team and Fedora QA,
   ensuring that both teams are aligned in verifying Fedora’s installation process and can act
   upon the results from a single integrated testing workflow.

While the **Anaconda Web UI** tests focus on upstream functionality, Fedora QA's tests remain
crucial for validating broader use cases that cannot currently be covered in the upstream test suite.

Viewing Latest Test Results
----------------------------

To view the results of the latest test runs, follow these steps:

#. Go to the GitHub Actions page for the `test compose workflow <https://github.com/rhinstaller/anaconda-webui/actions/workflows/test-compose.yml>`_.

#. Click on the latest run (or the one you need).

#. On the workflow run page, you will see the message: *'Triggered by schedule X hours ago'*

#. Next to this message, you'll find a commit SHA that contains the test run. Click on the commit SHA.

#. After clicking the commit SHA, you will be taken to a page where you can find the test results.

Current Limitations
-------------------

While this integration improves testing efficiency and collaboration, there are still some
limitations that need to be addressed:

- **Test Failure Notifications**: Currently, if any tests fail, there is no automatic notification
  mechanism in place to alert the team. The team must manually monitor the Fedora Wiki pages for
  missing or failed results. We are working on improving this process to ensure better tracking and
  responsiveness in the future.
- **Architecture**: Currently, tests are only run on `x86_64` architecture. Support for additional
  architectures will be added in the future.
- **Firmware Boot Mode**: Not all tests are currently tested with UEFI, only tests that are considered
  firmware-specific are run with UEFI firmware boot mode. This may need to change to better align with
  Fedora's QA test matrix.

Workflow Summary
----------------

This is an overview of how the integration workflow operates:

#. **Test Execution**

   * The `GitHub Action <../.github/workflows/test-compose.yml>`_ triggers the test suite to run daily
     on the latest Fedora Compose (or a specified compose).

#. **Test Report Generation**

   * The upstream test results are stored in a `report.json` file.

#. **Mapping to Fedora QA**

   * The upstream tests are mapped to Fedora’s QA test scenarios using the `wiki-testmap.json <test/wiki-testmap.json>`_ file.

#. **Publishing to Fedora Wiki**

   * The `wiki-report.py <test/wiki-report.py>`_ script publishes the mapped results to the
     `Fedora QA Wiki <https://fedoraproject.org/wiki/Test_Results:Current_Installation_Test>`_ page.

Example of `report.json`
-------------------------

.. code-block:: json

    {
      "metadata": {
        "compose": "Fedora-Rawhide-20250424.n.0",
        "test_env": "qemu-x86_64"
      },
      "tests": [
        {
          "arch": "x86_64",
          "firmware": "BIOS",
          "status": "pass",
          "test_name": "TestStorageCockpitIntegration.testBtrfsSubvolumes",
          "error": null
        },
        {
          "arch": "x86_64",
          "error": "Traceback (most recent call last):\n  File \"/work/make-checkout-workdir/test/check-storage-cockpit-e2e\", line 8...",
          "firmware": "BIOS",
          "status": "fail",
          "test_name": "TestStorageCockpitIntegration.testStandardPartitionExt4"
        }
      ],
      "timestamp": "2025-01-17T10:30:00Z"
    }

This is a sample `report.json` showing the results of individual tests, including whether each test
passed or failed.
