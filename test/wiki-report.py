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

import json
import logging
import sys
from operator import attrgetter

import mwclient.errors  # type: ignore[import-untyped]
from wikitcms.wiki import ResTuple, Wiki  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)
logging.basicConfig(stream=sys.stdout, level=logging.INFO)

class LoginError(Exception):
    """Raised when cannot log in to wiki to submit results."""
    pass


class WikiReport:
    def __init__(self, report_path):
        self.report_path = report_path
        self.report = self.parse_json_report()
        self.compose_id = self.report["metadata"]["compose"]
        self.compose = self.compose_id.split("-")[-1]
        self.wiki_hostname = "stg.fedoraproject.org"

    def get_passed_testcases(self):
        passed_testcases = set()

        testmap = json.load(open("./test/wiki-testmap.json", "r"))

        for testcase in self.report["tests"]:
            # Skip testcases that don't have an openqa test associated with them
            # Check testmap urls for the testcases
            # testmap is a list of dictionaries, each with a "testname" and "fedora-wiki-testcase" and section and milestone keys
            # If the testname in the testmap matches the openqa_test in the report, we can use the fedora-wiki-testcase
            # and section and milestone to report the result to the wiki
            if testcase["test_name"] not in [test["testname"] for test in testmap]:
                logger.warning("test %s not in testmap, skipping", testcase["test_name"])
                continue

            fedora_testcase = next(
                (test for test in testmap if test["testname"] == testcase["test_name"]),
                None
            )
            fedora_wiki_testcase = fedora_testcase["fedora-wiki-testcase"]
            milestone = fedora_testcase["milestone"]
            section = fedora_testcase["section"]

            if testcase["status"] == "pass":

                passed_testcases.add(
                    ResTuple(
                        bot=True,
                        cid=self.compose_id,
                        compose=self.compose,
                        dist="Fedora",
                        env=fedora_testcase['environment'] if 'environment' in fedora_testcase else f"{testcase['arch']} {testcase['firmware']}",
                        milestone=milestone,
                        release="42",
                        user="anaconda-bot",
                        section=section,
                        status="pass",
                        testcase=fedora_wiki_testcase,
                        testtype="Installation",
                    )
                )

        return sorted(passed_testcases, key=attrgetter('testcase'))

    def parse_json_report(self):
        with open(self.report_path, "r") as f:
            return json.load(f)

    def login(self, wiki):
        if not wiki.logged_in:
            # This seems to occasionally throw bogus WrongPass errors
            try:
                wiki.login()
            except mwclient.errors.LoginError:
                wiki.login()

        if not wiki.logged_in:
            logger.error("could not log in to wiki")
            raise LoginError

    def upload_report(self, wiki, passed_testcases):
        # Submit the results
        (insuffs, dupes) = wiki.report_validation_results(passed_testcases)

        for dupe in dupes:
            tmpl = "already reported result for test %s, env %s! Will not report dupe."
            logger.info(tmpl, dupe.testcase, dupe.env)
            logger.debug("full ResTuple: %s", dupe)

        for insuff in insuffs:
            tmpl = "insufficient data for test %s, env %s! Will not report."
            logger.info(tmpl, insuff.testcase, insuff.env)
            logger.debug("full ResTuple: %s", insuff)

        return []

    def run(self):
        wiki = Wiki(self.wiki_hostname)

        passed_testcases = self.get_passed_testcases()
        logger.info("passed testcases: %s", passed_testcases)

        self.login(wiki)

        self.upload_report(wiki, passed_testcases)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: compose-report.py <report_path>")
        sys.exit(1)

    WikiReport(sys.argv[1]).run()
