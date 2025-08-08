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

ifeq ($(TEST_OS),)
    ifdef TEST_COMPOSE
        ifneq ($(findstring Rawhide,$(TEST_COMPOSE)),)
            TEST_OS=fedora-rawhide-boot
        else
            TEST_OS=fedora-$(word 2,$(subst -, ,$(TEST_COMPOSE)))-boot
        endif
    else
        TEST_OS=fedora-rawhide-boot
    endif
endif

BASE_OS=$(word 1,$(subst -, ,$(TEST_OS)))
RELEASE=$(word 2,$(subst -, ,$(TEST_OS)))

# common arguments for tar, mostly to make the generated tarballs reproducible
TAR_ARGS = --sort=name --mtime "@$(shell git show --no-patch --format='%at')" --mode=go=rX,u+rw,a-s --numeric-owner --owner=0 --group=0

# Anaconda specific variables
ifeq ($(TEST_OS),)
PAYLOAD=fedora-rawhide-anaconda-payload
else
VARIANT=$(shell echo $(TEST_OS) | sed 's/-boot//')
PAYLOAD=$(VARIANT)-anaconda-payload
endif

GITHUB_BASE=rhinstaller/anaconda-webui
UPDATES_IMG=updates.img
TEST_LIVE_OS=fedora-rawhide-live-boot

export GITHUB_BASE
export TEST_OS

#
# i18n
#

LINGUAS=$(basename $(notdir $(wildcard po/*.po)))

po/$(PACKAGE_NAME).js.pot:
	xgettext --default-domain=$(PACKAGE_NAME) --output=$@ --language=C --keyword= \
		--keyword=_:1,1t --keyword=_:1c,2,2t --keyword=C_:1c,2 \
		--keyword=N_ --keyword=NC_:1c,2 \
		--keyword=gettext:1,1t --keyword=gettext:1c,2,2t \
		--keyword=ngettext:1,2,3t --keyword=ngettext:1c,2,3,4t \
		--keyword=gettextCatalog.getString:1,3c --keyword=gettextCatalog.getPlural:2,3,4c \
		--from-code=UTF-8 $$(find src/ -name '*.js' -o -name '*.jsx')

po/$(PACKAGE_NAME).html.pot: $(NODE_MODULES_TEST) $(COCKPIT_REPO_STAMP)
	pkg/lib/html2po -o $@ $$(find src -name '*.html')

po/$(PACKAGE_NAME).manifest.pot: $(NODE_MODULES_TEST) $(COCKPIT_REPO_STAMP)
	pkg/lib/manifest2po src/manifest.json -o $@

po/$(PACKAGE_NAME).pot: po/$(PACKAGE_NAME).html.pot po/$(PACKAGE_NAME).js.pot po/$(PACKAGE_NAME).manifest.pot
	msgcat --sort-output --output-file=$@ $^

po/LINGUAS:
	echo $(LINGUAS) | tr ' ' '\n' > $@

#
# Build/Install/dist
#
all: $(DIST_TEST)

dist_libexec_SCRIPTS = webui-desktop browser-ext
# makes sure it gets built as part of `make` and `make dist`
dist_noinst_DATA = \
	$(DIST_TEST) \
	$(COCKPIT_REPO_STAMP) \
	package-lock.json \
	package.json \
	build.js

$(SPEC): packaging/$(SPEC).in $(NODE_MODULES_TEST)
	provides=$$(npm ls --omit dev --package-lock-only --depth=Infinity | grep -Eo '[^[:space:]]+@[^[:space:]]+' | sort -u | sed 's/^/Provides: bundled(npm(/; s/\(.*\)@/\1)) = /'); \
	awk -v p="$$provides" '{gsub(/%{VERSION}/, "$(VERSION)"); gsub(/%{NPM_PROVIDES}/, p)}1' $< > $@

$(DIST_TEST): $(COCKPIT_REPO_STAMP) $(shell find src/ -type f) package.json build.js
	$(MAKE) package-lock.json && NODE_ENV=production ./build.js

watch:
	rm -f dist/*
	NODE_ENV=$(NODE_ENV) ESBUILD_WATCH=true ./build.js

rsync:
	RSYNC=$${RSYNC:-test-updates} make watch

# Generate comprehensive installation documentation (includes steps and storage scenarios)
# NOTE: Run this and commit changes when modifying UI components - CI will check if docs are current
.PHONY: docs
docs:
	node docs/generate-docs.js
	@echo "Installation documentation generated in docs/"

install: $(DIST_TEST) po/LINGUAS
	mkdir -p $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)
	cp -r dist/* $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)
	mkdir -p $(DESTDIR)/usr/share/anaconda
	cp -r firefox-theme $(DESTDIR)/usr/share/anaconda/
	mkdir -p $(DESTDIR)/usr/share/applications
	cp extlinks.desktop $(DESTDIR)/usr/share/applications/
	cp anaconda-gnome-control-center.desktop $(DESTDIR)/usr/share/applications/
	mkdir -p $(DESTDIR)/usr/libexec/anaconda
	cp webui-desktop $(DESTDIR)/usr/libexec/anaconda
	cp browser-ext $(DESTDIR)/usr/libexec/anaconda
	cp src/scripts/cockpit-coproc-wrapper.sh $(DESTDIR)/usr/libexec/anaconda/
	ln -sTfr $(DESTDIR)/usr/share/pixmaps/fedora-logo-sprite.svg $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)/logo.svg
	mkdir -p $(DESTDIR)/usr/lib/systemd/system/
	cp src/systemd/webui-cockpit-ws.service $(DESTDIR)/usr/lib/systemd/system/

# required for running integration tests;
TEST_NPMS = \
	node_modules/sizzle \
	$(NULL)

dist: $(TARFILE)
	@ls -1 $(TARFILE)

# when building a distribution tarball, call bundler with a 'production' environment
# we don't ship most node_modules for license and compactness reasons, only the ones necessary for running tests
# we ship a pre-built dist/ (so it's not necessary) and ship package-lock.json (so that node_modules/ can be reconstructed if necessary)
$(TARFILE): export NODE_ENV ?= production
$(TARFILE): $(DIST_TEST) $(SPEC)
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
	tools/node-modules \
	$(NULL)

COCKPIT_REPO_URL = https://github.com/cockpit-project/cockpit.git
COCKPIT_REPO_COMMIT = a3ca35f727ae1d35a4fd139d1dc7894974c5c468 # 344

$(COCKPIT_REPO_FILES): $(COCKPIT_REPO_STAMP)
COCKPIT_REPO_TREE = '$(strip $(COCKPIT_REPO_COMMIT))^{tree}'
$(COCKPIT_REPO_STAMP): Makefile
	@git rev-list --quiet --objects $(COCKPIT_REPO_TREE) -- 2>/dev/null || \
	     git fetch --no-tags --no-write-fetch-head --depth=1 $(COCKPIT_REPO_URL) $(COCKPIT_REPO_COMMIT)
	git archive $(COCKPIT_REPO_TREE) -- $(COCKPIT_REPO_FILES) | tar x

.PHONY: codecheck
codecheck: test/common $(NODE_MODULES_TEST)
	test/common/static-code

# checkout Cockpit's bots for standard test VM images and API to launch them
# must be from main, as only that has current and existing images; but testvm.py API is stable
# support CI testing against a bots change
# Workaround cockpit's expectation for test/images directory. This is not really needed in our case
# as we consume ready ISOs
# https://github.com/cockpit-project/cockpit/blob/main/test/common/testlib.py#L1118
bots: test/common
	test/common/make-bots
	cd test && ln -sf ../bots/images images

live-vm: bots $(UPDATES_IMG)
	./test/webui_testvm.py $(TEST_LIVE_OS)

prepare-test-deps: bots test/common test/reference payload images

.PHONY: payload
payload: bots
	bots/image-download $(PAYLOAD)

.PHONY: images
images: bots
	# Download cloud images
	bots/image-download debian-testing ubuntu-stable fedora-41 fedora-42 fedora-rawhide
	# Downoad ISO images: if a compose if specified download from
	# the compose otherwise download the ISO from Cockpit image server
	@if [ -n "$(TEST_COMPOSE)" ]; then \
		test/download-iso "$(TEST_OS)" "$(TEST_COMPOSE)" "$(RELEASE)"; \
	fi
	bots/image-download "$(TEST_OS)"

$(UPDATES_IMG): prepare-test-deps
	test/prepare-updates-img

create-updates.img: bots
	-rm *updates.img
	make $(UPDATES_IMG)

test/reference: test/common
	test/common/pixel-tests pull

update-reference-images: test/common test/reference
	test/common/pixel-tests push

# We want tools/node-modules to run every time package-lock.json is requested
# See https://www.gnu.org/software/make/manual/html_node/Force-Targets.html
FORCE:
$(NODE_MODULES_TEST): FORCE tools/node-modules
	tools/node-modules make_package_lock_json

.PHONY: test-compose
test-compose: bots
	bots/tests-trigger --force "-" "${TEST_OS}/compose-${TEST_COMPOSE}"
	bots/tests-trigger --force "-" "${TEST_OS}/efi-compose-${TEST_COMPOSE}"

.PHONY: test-compose-staging
test-compose-staging: bots
	bots/tests-trigger --force "-" "${TEST_OS}/compose-${TEST_COMPOSE}-staging"
	bots/tests-trigger --force "-" "${TEST_OS}/efi-compose-${TEST_COMPOSE}-staging"
