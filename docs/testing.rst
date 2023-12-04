Fix ISO image refreshes for the WebUI tests
-------------------------------------------

In order to test the WebUI code we use the ISO images specified in `Cockpit's bots repository <https://github.com/cockpit-project/bots/tree/main/images>`_.

These ISO files are direct downloads from the official distribution server and their
`creation process is defined in bots repository <https://github.com/cockpit-project/bots/blob/main/images/scripts/fedora-rawhide-boot.bootstrap>`_.

The purpose of using these ISOs for the tests instead of downloading from the official server is to gate the image updates.

The default refresh period of the test images is one week, but they can also be `refreshed manually <https://github.com/cockpit-project/bots#refreshing-a-test-image>`_.

Image refreshes happen with `Pull Requests which update the current image SHA <https://github.com/cockpit-project/bots/pull/2981>`_.
The tests defined in `tests/` will run on the Pull request gating the `relevant to anaconda image refreshes <https://github.com/cockpit-project/bots/blob/main/lib/testmap.py>`_.

Image refreshes with successfull CI will be merged automagically from Cockpit team.

In the case an updated dependency makes the WebUI tests on the image refresh fail, the on-duty team
member is in charge of debugging the failure.

For this take the following steps:

    * Locally checkout the bots repository branch used in the failing refresh PR. The path to the local bots checkout should be the `bots`.
    * Create the test VM with the new image and debug by following the `WebUI test instructions <https://github.com/rhinstaller/anaconda-webui/tree/main/test#readme>`_

When the reason for the breackage is identified there are two options to go forward:

    * If the failure comes from an intended change in behaviour adjust Anaconda or the tests
    * If the failure uncovers an actual regression, file bugs for the given Fedora components. If it does not look like the issue will be
      fixed quickly, work around in Anaconda or add a `naughty override file <https://github.com/cockpit-project/bots/tree/main/naughty/>`_, thus marking the expected failure pattern.

Fix a class of NPM errors that can break Web UI tests
-----------------------------------------------------

This issue manifests as failed build of Anaconda RPMs due to NPM errors, that prevents Web UI tests to be started at all. This differs
from an actual bug in NPM dependency specification or NPM package maintainers going all "it works on my machine" again in two key aspects:

    * the same NPM error suddenly breaks Web UI tests on *all* PRs
    * when Web UI tests are run locally outside of Cockpit CI the build succeeds and the test are started

What you are seeing is breakage in NPM caching the Cockpit CI is using to avoid issues with the massive NPM consumption of the infra.
The mechanism it usually works fine, but sometimes the cache update mechanism can get stuck, resulting in the cache going stale causing
this issue to manifest.

How to fix:

   * retry the test run on the PR - sometimes no all the builders are currently affected, retrying might run the test on different builder
   * report the issue to the Cockpit team - on #cockpit on Libera Chat IRC or as a new issue in https://github.com/cockpit-project/cockpit/issues

In the end, someone from the Cockpit team will tell the builders in the Cockpit infra to drop their cache, fixing the issue or the affected
builder possibly gets cleaned up by some automated mechanism over time.
