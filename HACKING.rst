Hacking on Anaconda Web UI
==========================

The commands here assume you're in the top level of the Anaconda Web UI git
repository checkout.

Setting up development container
--------------------------------

The anaconda team uses a containerized development environment using toolbx.
If you can install [toolbx](https://containertoolbx.org/) or
[distrobox](https://distrobox.privatedns.org/) on your system, it is highly
recommended to do that:

 - It is known to work and gives you reproducible results.
 - It avoids having to install development packages on your main machine.

If you are not interested in dealing with containers, just skip this part and continue on the next one::

    sudo dnf install toolbox

To create and enter a development toolbx for Anaconda Web UI run this command::

    toolbox create --image ghcr.io/cockpit-project/tasks -c anaconda-webui
    toolbox enter anaconda-webui


Working on Anaconda Web UI
--------------------------

To prepare Anaconda Web UI sources, you need to run this command::

    make dist

The easiest way to test changes you make is to set up a test VM.
You can find intructions for preparing a test VM at ``test/README.rst``.

Running eslint
--------------

Anaconda Web UI uses `ESLint <https://eslint.org/>`_ to automatically check
JavaScript code style in `.js` and `.jsx` files.

ESLint is executed as part of `test/common/static-code`, aka. `make codecheck`.

For developer convenience, the ESLint can be started explicitly by::

    npm run eslint

Violations of some rules can be fixed automatically by::

    npm run eslint:fix

Rules configuration can be found in the `.eslintrc.json` file.

Running stylelint
------------------

Cockpit uses `Stylelint <https://stylelint.io/>`_ to automatically check CSS code
style in `.css` and `scss` files.

Styleint is executed as part of `test/common/static-code`, aka. `make codecheck`.

For developer convenience, the Stylelint can be started explicitly by::

    npm run stylelint

Violations of some rules can be fixed automatically by::

    npm run stylelint:fix

Rules configuration can be found in the `.stylelintrc.json` file.

Development with rsync mode
---------------------------

When developing the Web UI, after every change to your sources we need to re-build
and the contents of dist directory need to be copied to the SSH target's
/usr/share/cockpit/anaconda-webui directory.

For automating this, you need to set up the SSH `test-updates` alias,
as described in `<test/README.rst>`_.

Then you can run::

    make rsync
