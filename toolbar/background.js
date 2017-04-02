"use strict";

// To hide the usual popup that comes up when hovering over link text,
// set browser.overlink-delay to 100000 in about:config. This will not
// hide it while it's showing connection/network status, however.



// Listen for CSS rules to inject, and relay all other messages.
chrome.runtime.onMessage.addListener((msg, tab) => {
  if (msg.injectCSS) {
    chrome.tabs.insertCSS(tab.tab.id, {
      cssOrigin: "author",
      runAt: "document_start",
      code: msg.injectCSS,
    });
  } else {
    chrome.tabs.sendMessage(tab.tab.id, msg);
  }
});



// Merely listen for ports so they're able to connect; they're
// only used to detect when the addon is disabled/uninstalled.
chrome.runtime.onConnect.addListener(() => {});

