#!/usr/bin/python3
#
# Copyright (C) 2026 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import time
from anacondalib import INSTALLER_VM_MEMORY_MB, VirtInstallMachineCase
from installer import Installer
from testlib import test_main  # pylint: disable=import-error


class TestSnakeGame(VirtInstallMachineCase):
    provision = {"machine1": {"memory_mb": INSTALLER_VM_MEMORY_MB}}
    no_selinux = True  # Ignorovat SELinux AVC zprávy v žurnálu

    def testSnakeGame(self):
        b = self.browser
        i = Installer(b, self.machine)

        # 1. Projít instalaci na obrazovku progress
        i.open()
        i.reach(i.steps.REVIEW)
        i.begin_installation(needs_confirmation=False)

        # Načtení instalační obrazovky
        b.wait_visible(".pf-v6-c-progress-stepper")

        # 2. Otevřít Snake modal
        b.wait_visible("#snake-play-btn")
        b.click("#snake-play-btn")

        # 3. Ověřit načtení modalu a herní desky
        b.wait_visible(".pf-v6-c-modal-box")
        b.wait_visible(".snake-board")

        # 4. Test přepnutí obtížnosti (uvnitř modalu)
        b.wait_visible("#snake-diff-hard")
        b.click("#snake-diff-hard")

        # 5. Test pohybu hada
        b.eval_js("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))")
        b.wait_timeout(300)
        b.eval_js("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))")
        b.wait_timeout(300)

        # 7. Test klávesnice (Mezerník pro Pause/Resume)
        b.eval_js("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))")
        b.wait_visible(".game-over-overlay")

        b.eval_js("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))")
        b.wait_not_present(".game-over-overlay")



if __name__ == '__main__':
    test_main()
