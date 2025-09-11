Anaconda Web UI
===============

Communicate with the team
-------------------------

We're happy to hear from you! Here's how to reach us:

- For **bug reports** and **feature requests**, `open a ticket on Bugzilla <https://bugzilla.redhat.com/enter_bug.cgi?product=Fedora&component=anaconda-webui>`_.
- For **real-time chat**, `join our Matrix room (#anaconda @ FedoraProject.org) <https://matrix.to/#/%23anaconda:fedoraproject.org>`_.
- For general help and longer discussions, `start or read a topic on our forum <https://discussion.fedoraproject.org/tag/anaconda>`_.

Getting the source
------------------

Here's where to get the code::

    git clone https://github.com/rhinstaller/anaconda-webui.git
    cd anaconda-webui

Development instructions
------------------------

See `<HACKING.rst>`_ and `<test/README.rst>`_ for details about how to efficiently change the code,
run, and test it.

Automated release
-----------------

The intention is that the only manual step for releasing a project is to create
a signed tag for the version number, which includes a summary of the noteworthy
changes::

    123

    - this new feature
    - fix bug #123

Pushing the release tag triggers the `release.yml <github/workflows/release.yml>`_
`GitHub action <https://github.com/features/actions>`_ workflow. This creates the
official release tarball and publishes as upstream release to GitHub.

The Fedora and COPR releases are done with `Packit <https://packit.dev/>`_.
see the `packit.yaml <./packit.yaml>`_ control file.

Automated maintenance
---------------------

It is important to keep your `NPM modules <./package.json>`_ up to date, to keep
up with security updates and bug fixes. This is done with dependabot, see the
`dependabot.yml <./.github/dependabot.yml>`_ control file.
Similarly, translations are refreshed every Tuesday evening (or manually) through the
`weblate-sync-po.yml <.github/workflows/weblate-sync-po.yml>`_ action.
Conversely, the PO template is uploaded to weblate every day through the
`weblate-sync-pot.yml <.github/workflows/weblate-sync-pot.yml>`_ action.
