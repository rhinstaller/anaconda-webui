# Copyright (C) 2023  Red Hat, Inc.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License as published
# by the Free Software Foundation; either version 2.1 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


# stamp file to check if/when npm install ran
# one example file in dist/ to check if that already ran
DIST_TEST=dist/manifest.json
PACKAGE_NAME := $(shell awk '/"name":/ {gsub(/[",]/, "", $$2); print $$2}' package.json)
RPM_NAME := $(PACKAGE_NAME)
VERSION := $(shell T=$$(git describe 2>/dev/null) || T=1; echo $$T | tr '-' '.')
TARFILE=$(RPM_NAME)-$(VERSION).tar.xz
SPEC=$(RPM_NAME).spec
# one example file in pkg/lib to check if it was already checked out
COCKPIT_REPO_STAMP=pkg/lib/cockpit-po-plugin.js
# stamp file to check if/when npm install ran
NODE_MODULES_TEST=package-lock.json
TEST_OS=fedora-rawhide-boot
# common arguments for tar, mostly to make the generated tarballs reproducible
TAR_ARGS = --sort=name --mtime "@$(shell git show --no-patch --format='%at')" --mode=go=rX,u+rw,a-s --numeric-owner --owner=0 --group=0

# Anaconda specific variables
PAYLOAD=fedora-rawhide-anaconda-payload
GITHUB_BASE=rhinstaller/anaconda-webui
UPDATES_IMG=updates.img
TEST_LIVE_OS=fedora-rawhide-live-boot

export GITHUB_BASE
export TEST_OS

#
# Build/Install/dist
#
all: $(DIST_TEST)

dist_libexec_SCRIPTS = webui-desktop
# makes sure it gets built as part of `make` and `make dist`
dist_noinst_DATA = \
	$(DIST_TEST) \
	$(COCKPIT_REPO_STAMP) \
	org.cockpit-project.anaconda-webui.metainfo.xml \
	package-lock.json \
	package.json \
	build.js

$(SPEC): packaging/$(SPEC).in $(NODE_MODULES_TEST)
	provides=$$(npm ls --omit dev --package-lock-only --depth=Infinity | grep -Eo '[^[:space:]]+@[^[:space:]]+' | sort -u | sed 's/^/Provides: bundled(npm(/; s/\(.*\)@/\1)) = /'); \
	awk -v p="$$provides" '{gsub(/%{VERSION}/, "$(VERSION)"); gsub(/%{NPM_PROVIDES}/, p)}1' $< > $@

$(DIST_TEST): $(COCKPIT_REPO_STAMP) $(shell find src/ -type f) $(NODE_MODULES_TEST) package.json build.js
	NODE_ENV=production ./build.js

watch:
	rm -f dist/*
	NODE_ENV=$(NODE_ENV) ESBUILD_WATCH=true ./build.js

rsync:
	RSYNC=$${RSYNC:-test-updates} make watch

install: $(DIST_TEST)
	mkdir -p $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)
	cp -r dist/* $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)
	mkdir -p $(DESTDIR)/usr/share/anaconda
	cp -r firefox-theme $(DESTDIR)/usr/share/anaconda/
	mkdir -p $(DESTDIR)/usr/share/metainfo/
	cp org.cockpit-project.$(PACKAGE_NAME).metainfo.xml $(DESTDIR)/usr/share/metainfo/
	mkdir -p $(DESTDIR)/usr/libexec
	cp webui-desktop $(DESTDIR)/usr/libexec/
	ln -sTfr $(DESTDIR)/usr/share/pixmaps/fedora-logo-sprite.svg $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)/logo.svg

# required for running integration tests; commander and ws are deps of chrome-remote-interface
TEST_NPMS = \
	node_modules/chrome-remote-interface \
	node_modules/commander \
	node_modules/sizzle \
	node_modules/ws \
	$(NULL)

dist: $(TARFILE)
	@ls -1 $(TARFILE)

# when building a distribution tarball, call bundler with a 'production' environment
# we don't ship most node_modules for license and compactness reasons, only the ones necessary for running tests
# we ship a pre-built dist/ (so it's not necessary) and ship package-lock.json (so that node_modules/ can be reconstructed if necessary)
$(TARFILE): export NODE_ENV ?= production
$(TARFILE): $(DIST_TEST) $(SPEC)
	if type appstream-util >/dev/null 2>&1; then appstream-util validate-relax --nonet *.metainfo.xml; fi
	tar --xz $(TAR_ARGS) -cf $(TARFILE) --transform 's,^,$(RPM_NAME)/,' \
		--exclude '*.in' --exclude test/reference \
		$$(git ls-files | grep -v node_modules) \
		$(COCKPIT_REPO_FILES) $(NODE_MODULES_TEST) $(SPEC) $(TEST_NPMS) \
		dist/

srpm: $(TARFILE) $(SPEC)
	rpmbuild -bs \
	  --define "_sourcedir `pwd`" \
	  --define "_srcrpmdir `pwd`" \
	  $(SPEC)

EXTRA_DIST = dist src firefox-theme

# checkout common files from Cockpit repository required to build this project;
# this has no API stability guarantee, so check out a stable tag when you start
# a new project, use the latest release, and update it from time to time
COCKPIT_REPO_FILES = \
	pkg/lib \
	test/common \
	$(NULL)

COCKPIT_REPO_URL = https://github.com/cockpit-project/cockpit.git
COCKPIT_REPO_COMMIT = 7baca286c10dc50884fcda02c45f338dd18f5e24 # 303 + inherit_machine_class

$(COCKPIT_REPO_FILES): $(COCKPIT_REPO_STAMP)
COCKPIT_REPO_TREE = '$(strip $(COCKPIT_REPO_COMMIT))^{tree}'
$(COCKPIT_REPO_STAMP): Makefile
	@git rev-list --quiet --objects $(COCKPIT_REPO_TREE) -- 2>/dev/null || \
	     git fetch --no-tags --no-write-fetch-head --depth=1 $(COCKPIT_REPO_URL) $(COCKPIT_REPO_COMMIT)
	git archive $(COCKPIT_REPO_TREE) -- $(COCKPIT_REPO_FILES) | tar x

# checkout Cockpit's bots for standard test VM images and API to launch them
# must be from main, as only that has current and existing images; but testvm.py API is stable
# support CI testing against a bots change
# Workaround cockpit's expectation for test/images directory. This is not really needed in our case
# as we consume ready ISOs
# https://github.com/cockpit-project/cockpit/blob/main/test/common/testlib.py#L1118
bots: test/common
	GITHUB_BASE="cockpit-project/cockpit" test/common/make-bots
	cd test && ln -sf ../bots/images images

live-vm: bots $(UPDATES_IMG)
	./test/webui_testvm.py $(TEST_LIVE_OS)

prepare-test-deps: bots test/common payload

.PHONY: payload
payload: bots
	bots/image-download $(PAYLOAD)

$(UPDATES_IMG): bots
	test/prepare-updates-img

create-updates.img: bots
	-rm $(UPDATES_IMG)
	make $(UPDATES_IMG)

# test runs in kernel_t context and triggers massive amounts of SELinux
# denials; SELinux gets disabled, but would still trigger unexpected messages
integration-test: prepare-test-deps test/reference $(UPDATES_IMG)
	TEST_AUDIT_NO_SELINUX=1 test/common/run-tests

test/reference: test/common
	test/common/pixel-tests pull

update-reference-images: test/common test/reference
	test/common/pixel-tests push

$(NODE_MODULES_TEST): package.json
	rm -f package-lock.json #  if it exists already, npm install won't update it; force that so that we always get up-to-date packages
	env -u NODE_ENV npm install #  unset NODE_ENV, skips devDependencies otherwise
	env -u NODE_ENV npm prune
