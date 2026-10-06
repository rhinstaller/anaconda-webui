import json
import os
from xmlrpc.client import Fault

MOCK_BUGS_PATH = "/tmp/anaconda-bugzilla-mock-bugs.json"


class Bug:
    def __init__(self, bug_id, summary, status):
        self.id = bug_id
        self.summary = summary
        self.status = status


class Bugzilla:
    def __init__(self, url, api_key=None):
        self.url = url
        self.api_key = api_key

    @property
    def logged_in(self):
        if not self.api_key or self.api_key == "invalid-api-key":
            raise Fault(300, "The API key you specified is invalid")
        return True

    def build_query(self, **kwargs):
        return kwargs

    def query(self, query):
        if not os.path.exists(MOCK_BUGS_PATH):
            return []
        with open(MOCK_BUGS_PATH, encoding="utf-8") as handle:
            data = json.load(handle)
        return [Bug(item["id"], item["summary"], item["status"]) for item in data]

    def createbug(self, **kwargs):
        class NewBug:
            id = 999999
        return NewBug()

    def attachfile(self, *args, **kwargs):
        return 1
