# Copyright (C) 2022 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import sys

HELPERS_DIR = os.path.dirname(__file__)
sys.path.append(HELPERS_DIR)

from step_logger import log_step


class Password():
    def __init__(self, browser, id_prefix):
        self.browser = browser
        self.id_prefix = id_prefix

    def check_pw_focused(self):
        sel = f"#{self.id_prefix}-password-field"
        self.browser.wait_visible(f"{sel}:focus")

    @log_step(snapshot_before=True)
    def check_pw_rule(self, rule, value):
        sel = f"#{self.id_prefix}-password-rule-{rule}"
        cls_value = f"pf-m-{value}"
        self.browser.wait_visible(sel)
        self.browser.wait_attr_contains(sel, "class", cls_value)

    @log_step(snapshot_before=True)
    def set_password(self, password, append=False, value_check=True):
        sel = f"#{self.id_prefix}-password-field"
        self.browser.set_input_text(sel, password, append=append, value_check=value_check)

    @log_step(snapshot_before=True)
    def check_password(self, password):
        sel = f"#{self.id_prefix}-password-field"
        self.browser.wait_val(sel, password)

    @log_step(snapshot_before=True)
    def set_password_confirm(self, password):
        sel = f"#{self.id_prefix}-password-confirm-field"
        self.browser.set_input_text(sel, password)

    @log_step(snapshot_before=True)
    def check_password_confirm(self, password):
        sel = f"#{self.id_prefix}-password-confirm-field"
        self.browser.wait_val(sel, password)

    @log_step(snapshot_before=True)
    def check_pw_strength(self, strength):
        sel = f"#{self.id_prefix}-password-strength-label"

        if strength is None:
            self.browser.wait_not_present(sel)
            return

        variant = ""
        if strength == "weak":
            variant = "error"
        elif strength == "medium":
            variant = "warning"
        elif strength == "strong":
            variant = "success"

        self.browser.wait_attr_contains(sel, "class", f"pf-m-{variant}")
