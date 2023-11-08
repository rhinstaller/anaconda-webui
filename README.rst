Anaconda Web UI
===============

Getting the source
------------------

Here's where to get the code::

    git clone https://github.com/rhinstaller/anaconda-webui.git
    cd anaconda-webui

Development instructions
------------------------

See [HACKING.md](./HACKING.md) for details about how to efficiently change the
code, run, and test it.

Automated release
-----------------

The intention is that the only manual step for releasing a project is to create
a signed tag for the version number, which includes a summary of the noteworthy
changes::

    123

    - this new feature
    - fix bug #123

Pushing the release tag triggers the [release.yml](.github/workflows/release.yml)
[GitHub action](https://github.com/features/actions) workflow. This creates the
official release tarball and publishes as upstream release to GitHub.

The Fedora and COPR releases are done with [Packit](https://packit.dev/),
see the [packit.yaml](./packit.yaml) control file.

Automated maintenance
---------------------

It is important to keep your [NPM modules](./package.json) up to date, to keep
up with security updates and bug fixes. This is done with dependabot, see the
[dependabot.yml](./.github/dependabot.yml) control file.
Similarly, translations are refreshed every Tuesday evening (or manually) through the
[weblate-sync-po.yml](.github/workflows/weblate-sync-po.yml) action.
Conversely, the PO template is uploaded to weblate every day through the
[weblate-sync-pot.yml](.github/workflows/weblate-sync-pot.yml) action.
