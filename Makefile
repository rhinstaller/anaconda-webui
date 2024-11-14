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
APPSTREAMFILE=org.cockpit-project.$(PACKAGE_NAME).metainfo.xml
ifeq ($(TEST_OS),)
TEST_OS=fedora-rawhide-boot
endif
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
	pkg/lib/html2po.js -o $@ $$(find src -name '*.html')

po/$(PACKAGE_NAME).manifest.pot: $(NODE_MODULES_TEST) $(COCKPIT_REPO_STAMP)
	pkg/lib/manifest2po.js src/manifest.json -o $@

po/$(PACKAGE_NAME).metainfo.pot: $(APPSTREAMFILE)
	xgettext --default-domain=$(PACKAGE_NAME) --output=$@ $<

po/$(PACKAGE_NAME).pot: po/$(PACKAGE_NAME).html.pot po/$(PACKAGE_NAME).js.pot po/$(PACKAGE_NAME).manifest.pot po/$(PACKAGE_NAME).metainfo.pot
	msgcat --sort-output --output-file=$@ $^

po/LINGUAS:
	echo $(LINGUAS) | tr ' ' '\n' > $@

#
# Build/Install/dist
#
all: $(DIST_TEST)

dist_libexec_SCRIPTS = webui-desktop firefox-ext
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

install: $(DIST_TEST) po/LINGUAS
	mkdir -p $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)
	cp -r dist/* $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)
	# CSS Licence file is empty, so don't keep it
	rm $(DESTDIR)/usr/share/cockpit/$(PACKAGE_NAME)/index.css.LEGAL.txt
	mkdir -p $(DESTDIR)/usr/share/anaconda
	cp -r firefox-theme $(DESTDIR)/usr/share/anaconda/
	mkdir -p $(DESTDIR)/usr/share/applications
	cp extlinks.desktop $(DESTDIR)/usr/share/applications/
	mkdir -p $(DESTDIR)/usr/share/metainfo/
	cp org.cockpit-project.$(PACKAGE_NAME).metainfo.xml $(DESTDIR)/usr/share/metainfo/
	mkdir -p $(DESTDIR)/usr/libexec/anaconda
	cp webui-desktop $(DESTDIR)/usr/libexec/anaconda
	cp firefox-ext $(DESTDIR)/usr/libexec/anaconda
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
	test/static-code \
	$(NULL)

COCKPIT_REPO_URL = https://github.com/cockpit-project/cockpit.git
COCKPIT_REPO_COMMIT = b0e82161b4afcb9f0a6fddd8ff94380e983b2238 # 328 + 23 commits

$(COCKPIT_REPO_FILES): $(COCKPIT_REPO_STAMP)
COCKPIT_REPO_TREE = '$(strip $(COCKPIT_REPO_COMMIT))^{tree}'
$(COCKPIT_REPO_STAMP): Makefile
	@git rev-list --quiet --objects $(COCKPIT_REPO_TREE) -- 2>/dev/null || \
	     git fetch --no-tags --no-write-fetch-head --depth=1 $(COCKPIT_REPO_URL) $(COCKPIT_REPO_COMMIT)
	git archive $(COCKPIT_REPO_TREE) -- $(COCKPIT_REPO_FILES) | tar x

.PHONY: codecheck
codecheck: test/static-code $(NODE_MODULES_TEST)
	test/static-code

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

prepare-test-deps: bots test/common test/reference payload images

.PHONY: payload
payload: bots
	bots/image-download $(PAYLOAD)

.PHONY: images
images: bots
	bots/image-download $(TEST_OS) debian-stable ubuntu-stable fedora-41

$(UPDATES_IMG): prepare-test-deps
	test/prepare-updates-img

create-updates.img: bots
	-rm *updates.img
	make $(UPDATES_IMG)

test/reference: test/common
	test/common/pixel-tests pull

update-reference-images: test/common test/reference
	test/common/pixel-tests push

$(NODE_MODULES_TEST): package.json
	rm -f package-lock.json #  if it exists already, npm install won't update it; force that so that we always get up-to-date packages
	env -u NODE_ENV npm install #  unset NODE_ENV, skips devDependencies otherwise
	env -u NODE_ENV npm prune
