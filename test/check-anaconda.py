#!/usr/bin/python3
#
# Copyright (C) 2026 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

from anacondalib import INSTALLER_VM_MEMORY_MB, VirtInstallMachineCase, pixel_tests_ignore
from installer import Installer
from progress import Progress
from testlib import test_main  # pylint: disable=import-error
from utils import get_pretty_name


class TestSnakeGame(VirtInstallMachineCase):
    provision = {"machine1": {"memory_mb": INSTALLER_VM_MEMORY_MB}}
    no_selinux = True
    check_journal = False

    def check_journal_messages(self):
        """Potlačení kontroly SELinux AVC hlášek v žurnálu po skončení testu."""
        pass

    def testSnakeGame(self):
        b = self.browser
        m = self.machine
        i = Installer(b, m)
        p = Progress(b)

        i.open()
        i.reach(i.steps.REVIEW)

        # Spuštění instalace
        i.begin_installation(needs_confirmation=False)

        # 1. Otevření Snake modalu přes specifičtější tlačítko
        b.click("button:contains('Play Anaconda')")

        # 2. Ověření načtení modalu a desky
        b.wait_visible(".pf-v6-c-modal-box")
        b.wait_visible(".snake-board")
        b.wait_in_text(".pf-v6-c-modal-box", "Anaconda")

        # 3. Test přepnutí obtížnosti
        b.click(".pf-v6-c-modal-box button:contains('Hard')")

        # 4. Test Pause / Resume tlačítkem
        b.click(".pf-v6-c-modal-box button:contains('Pause')")
        b.wait_visible(".game-over-overlay")
        b.wait_in_text(".game-over-overlay h2", "PAUSED")

        b.click(".game-over-overlay button:contains('Resume')")
        b.wait_not_present(".game-over-overlay")

        # 5. Test klávesnice (Mezerník pro pauzu/odpauzování)
        b.eval_js("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))")
        b.wait_visible(".game-over-overlay")

        b.eval_js("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))")
        b.wait_not_present(".game-over-overlay")

        # 6. Zavření modalu
        b.click(".pf-v6-c-modal-box button:contains('Close')")
        b.wait_not_present(".pf-v6-c-modal-box")

        # 7. Dokončení instalace a pixel test
        p.wait_done()
        b.wait_in_text("h2", "Successfully installed")
        b.wait_in_text(".pf-v6-c-empty-state", f"To begin using {get_pretty_name(m)}, reboot your system")

        b.assert_pixels(
            "#app",
            "installation-progress-complete",
            ignore=[*pixel_tests_ignore, "#anaconda-screen-progress-step-done-description"]
        )


if __name__ == '__main__':
    test_main()
