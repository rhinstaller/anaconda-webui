=================
Release Process
=================

We trigger releases manually, not on a fixed schedule, and rely on GitHub Actions and Packit to handle the rest automatically.

This document outlines the detailed release procedure.

1. **Review release blockers**

   Issues and PRs that are urgent for the next release should have the
   `release-blocker <https://github.com/rhinstaller/anaconda-webui/labels/release-blocker>`_ label.

   Review the list and confirm with the team whether any pending items remain for the current release.

2. **Identify the previous release**

   Run::

       PREV=$(git describe --abbrev=0 --tags); echo $PREV

3. **Review recent changes**

   Generate a changelog with::

       git shortlog --no-merges $PREV..

   Focus on new features. Skip test-only changes and minor bug fixes.

4. **Prepare the release summary and tag**

   Use the changelog to create a "release news" summary. This appears in:

   - the GitHub release page
   - downstream package changelogs (via the tag message)

   Follow this tagging format::

       123

       - Add this cool new feature
       - Support Python 3
       - Fix wrong color on the bikeshed (rhbz#123456)

   Create the tag::

       git tag -s <new-tag>

   Or use ``-a`` if you don't have a GPG key.

   Push the tag to the main branch::

       git push origin <new-tag>

5. **GitHub release automation**

   Tagging triggers the `release GitHub workflow <https://github.com/rhinstaller/anaconda-webui/blob/main/.github/workflows/release.yml>`_,
   which creates the upstream GitHub release.

   To monitor the release progress and view logs:

   - Visit the `Releases page <https://github.com/rhinstaller/anaconda-webui/releases>`_
   - Click the tagged commit (7-character hash)
   - Click the *Statuses* icon (✅, ❌, or 🟡) next to the commit subject
   - Select a "propose-downstream" or "rpm-build" **Details** link to access the full run logs

   Example logs page: ``https://github.com/rhinstaller/anaconda-webui/runs/...``

6. **Packit downstream packaging**

   Packit will automatically open `Fedora dist-git pull requests <https://src.fedoraproject.org/rpms/anaconda-webui/pull-requests>`_
   for Rawhide and supported Fedora releases.

   Wait for the PRs to appear and pass:

   - Scratch build checks
   - Integration testing

   Merge the PRs once they're ready.

   Merging triggers:

   - Koji builds
   - Bodhi updates

Skipping the Koji Build
=======================

If you need to do a combined Bodhi update with another package (e.g. ``anaconda``) and want to
handle the Koji build and Bodhi update manually, add the ``skip-build`` label to the dist-git pull
request **before merging**. This prevents Packit from triggering the automatic Koji build.

You will then need to perform the Koji build and Bodhi update manually.

