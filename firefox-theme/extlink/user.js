/* global user_pref */
// Don't have any startup page
user_pref("browser.startup.page", 0);
user_pref("browser.startup.homepage", "about:blank");
user_pref("browser.startup.homepage_override.once", {});

// Disable password manager popups
user_pref("signon.showAutoCompleteFooter", false);
user_pref("signon.rememberSignons", false);
