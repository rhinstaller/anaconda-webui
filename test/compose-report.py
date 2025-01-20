#!/usr/bin/python3

# Copyright (C) 2025 Red Hat, Inc.
#
# This program is free software; you can redistribute it and/or modify it
# under the terms of the GNU Lesser General Public License as published by
# the Free Software Foundation; either version 2.1 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with this program; If not, see <http://www.gnu.org/licenses/>.

import sys

from wikitcms.wiki import Wiki
from wikitcms.result import ResultRow, Result


class ComposeReport:
    def __init__(self, compose_id, report_path):
        self.compose_id = compose_id
        self.report_path = report_path
        self.report = self.parse_json_report()

    def get_test_result_page(compose_id):
        # FIXME: Hardcode Fedora 42 temporarily
        # Compose ID example: Fedora-Rawhide-20250119.n.0
        # Page URL example: https://fedoraproject.org/wiki/Test_Results:Fedora_42_Rawhide_20250119.n.0_Installation
        compose_date = compose_id.split("-")[2]
        return f"https://fedoraproject.org/wiki/Test_Results:Fedora_42_Rawhide{compose_date}_Installation"

    def parse_json_report(self):
        with open(self.report_path, "r") as f:
            return json.load(f)

    def upload_report(self):
        wiki = Wiki()
        wiki.login()

        validation_page = wiki.pages(self.get_test_result_page(self.compose_id))

        # validation_page contains ResultRow contains Result
        # Let's convert self.report to ResultRow s for the validation_page
        # and then upload the validation_page
        for report_result in self.report:
            result = Result(status="pass" if report_result["status"] == "PASSED" else "fail",
                            user="anaconda-user",
                            bot=True,
                            )
        # FIXME: Figure out how to construct ResultRow and edit the validation_page



if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: compose-report.py <compose_id> <report_path>")
        sys.exit(1)

    ComposeReport(sys.argv[1], sys.argv[2]).upload_report()
