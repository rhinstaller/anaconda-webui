Name:           anaconda-webui
Version:        5.2.12.gb98add5b3
Release:        1%{?dist}
Summary:        Anaconda installer Web interface
License:        LGPL-2.1-or-later AND MIT
URL:            https://github.com/rhinstaller/%{name}

Source0:        https://github.com/rhinstaller/%{name}/releases/download/%{version}/%{name}-%{version}.tar.xz
BuildArch:      noarch
BuildRequires:  libappstream-glib
BuildRequires:  make
BuildRequires:  gettext

%global anacondacorever 40.20
%global cockpitver 275
%global cockpitstorver 310

Requires: cockpit-storaged >= %{cockpitstorver}
Requires: cockpit-bridge >= %{cockpitver}
Requires: cockpit-ws >= %{cockpitver}
Requires: anaconda-core  >= %{anacondacorever}
# Minimal version of the Anaconda DBus API necessary for the Anaconda WebUI to run
Requires: anaconda-dbus-api >= 100
# Firefox dependency needs to be specified there as cockpit web-view does not have a hard dependency on Firefox as
# it can often fall back to a diferent browser. This does not work in the limited installer
# environment, so we need to make sure Firefox is available. Exclude on RHEL, only Flatpak version will be there.
%if ! 0%{?rhel}
Requires: firefox
%endif
%if 0%{?fedora}
Requires: fedora-logos
%endif

Provides: bundled(npm(attr-accept)) = 2.2.2
Provides: bundled(npm(file-selector)) = 0.6.0
Provides: bundled(npm(focus-trap)) = 7.5.2
Provides: bundled(npm(js-tokens)) = 4.0.0
Provides: bundled(npm(lodash)) = 4.17.21
Provides: bundled(npm(loose-envify)) = 1.4.0
Provides: bundled(npm(memoize-one)) = 5.2.1
Provides: bundled(npm(object-assign)) = 4.1.1
Provides: bundled(npm(@patternfly/patternfly)) = 5.2.0
Provides: bundled(npm(@patternfly/react-core)) = 5.2.0
Provides: bundled(npm(@patternfly/react-icons)) = 5.2.0
Provides: bundled(npm(@patternfly/react-log-viewer)) = 5.1.0
Provides: bundled(npm(@patternfly/react-styles)) = 5.2.0
Provides: bundled(npm(@patternfly/react-table)) = 5.2.0
Provides: bundled(npm(@patternfly/react-tokens)) = 5.2.0
Provides: bundled(npm(prop-types)) = 15.8.1
Provides: bundled(npm(react-dom)) = 18.2.0
Provides: bundled(npm(react-dropzone)) = 14.2.3
Provides: bundled(npm(react-is)) = 16.13.1
Provides: bundled(npm(react)) = 18.2.0
Provides: bundled(npm(scheduler)) = 0.23.0
Provides: bundled(npm(tabbable)) = 6.2.0
Provides: bundled(npm(throttle-debounce)) = 5.0.0
Provides: bundled(npm(tslib)) = 2.6.2

%description
Anaconda installer Web interface

%prep
%setup -q -n %{name}

%build
# Nothing to build

%install
%make_install PREFIX=/usr
appstream-util validate-relax --nonet %{buildroot}/%{_datadir}/metainfo/*

%check
exit 0
# We have some integration tests, but those require running a VM, so that would
# be an overkill for RPM check script.

%files
%dir %{_datadir}/cockpit/anaconda-webui
%doc README.rst
%license LICENSE dist/index.js.LEGAL.txt
%{_datadir}/cockpit/anaconda-webui/logo.svg
%{_datadir}/cockpit/anaconda-webui/qr-code-feedback.svg
%{_datadir}/cockpit/anaconda-webui/index.js.LEGAL.txt
%{_datadir}/cockpit/anaconda-webui/index.html
%{_datadir}/cockpit/anaconda-webui/index.js.gz
%{_datadir}/cockpit/anaconda-webui/index.js.map
%{_datadir}/cockpit/anaconda-webui/index.css.gz
%{_datadir}/cockpit/anaconda-webui/index.css.map
%{_datadir}/cockpit/anaconda-webui/manifest.json
%{_datadir}/metainfo/org.cockpit-project.anaconda-webui.metainfo.xml
%{_datadir}/cockpit/anaconda-webui/po.*.js.gz
%dir %{_datadir}/anaconda/firefox-theme
%dir %{_datadir}/anaconda/firefox-theme/default
%dir %{_datadir}/anaconda/firefox-theme/default/chrome
%{_datadir}/anaconda/firefox-theme/default/user.js
%{_datadir}/anaconda/firefox-theme/default/chrome/userChrome.css
%dir %{_datadir}/anaconda/firefox-theme/live
%dir %{_datadir}/anaconda/firefox-theme/live/chrome
%{_datadir}/anaconda/firefox-theme/live/user.js
%{_datadir}/anaconda/firefox-theme/live/chrome/userChrome.css
%{_libexecdir}/webui-desktop


# The changelog is automatically generated and merged
%changelog
