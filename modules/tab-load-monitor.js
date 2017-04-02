(function() {
  // Track the page-load progress for visible/active tabs. This is a quick
  // attempt, and could almost certainly be improved a great deal.

  const URL_FILTERS = ["http://*/*", "https://*/*"],
        URL_SCHEMES = ["http", "https"];

  let gTabNavs = {}, // stores how many navigations are taking place for a tab
      gTabProgress = {}, // stores the active progress messages for each tab
      gTabRequests = {}, // tracks each request's progress for each tab
      gActiveWindowTabs = {}; // track which tabs to keep updated

  // Figure out the active tabs in each window while the addon starts up
  chrome.tabs.query({active: true}, tabs => {
    for (let tab of tabs) {
      gActiveWindowTabs[tab.windowId] = tab.id;
    }
  });

  // Keep track of the active tab in each window
  chrome.tabs.onActivated.addListener(details => {
    let tabId = details.tabId;
    gActiveWindowTabs[details.windowId] = tabId;
    updateTabProgress(details);
  });

  chrome.tabs.onCreated.addListener(details => {
    let tabId = details.id;
    gActiveWindowTabs[details.windowId] = tabId;
  });

  // Clear our cached values when tabs/windows close.
  chrome.tabs.onRemoved.addListener(tabId => {
    delete(gTabNavs[tabId]);
    delete(gTabProgress[tabId]);
    delete(gTabRequests[tabId]);
  });

  chrome.windows.onRemoved.addListener(windowId => {
    delete(gActiveWindowTabs[windowId]);
  });

  // Keep track of the number of frames ("navigations") each tab
  // has ongoing, so we can detect when they're done loading.
  chrome.webNavigation.onBeforeNavigate.addListener(details => {
    // frameId=0 is the top frame; its URL is changing if it gets
    // a fresh onBeforeNavigation, so clear out data for the tab.
    let tabId = details.tabId;
    if (!details.frameId) {
      gTabNavs[tabId] = 1;
      gTabProgress[tabId] = {progress: 0, progressMax: 1};
      gTabRequests[tabId] = {};
    } else {
      let navs = gTabNavs[tabId];
      if (navs === "DONE") return;
      gTabNavs[tabId]++;
    }

    updateTabProgress(details, progress => {
      progress.message = {
        type: "connectingTo",
        url: new URL(details.url).host
      };
    });
  }, {url: [{schemes: URL_SCHEMES}]});

  function onNavDone(details) {
    if (gTabNavs[details.tabId] === "DONE" ||
        --gTabNavs[details.tabId]) {
      return;
    }
    gTabNavs[details.tabId] = "DONE";
    delete(gTabRequests[details.tabId]);
    updateTabProgress(details, progress => {
      progress.message = null;
      progress.progress = progress.progressMax;
    });
  }
  chrome.webNavigation.onCompleted.addListener(
    onNavDone, {url: [{schemes: URL_SCHEMES}]});
  chrome.webNavigation.onErrorOccurred.addListener(
    onNavDone, {url: [{schemes: URL_SCHEMES}]});

  // Keep track of each network request a tab makes,
  // so we can update the toolbar of its current status
  // based on how many requests still have to be completed,
  // and what the latest "task" being done is.
  chrome.webRequest.onBeforeRequest.addListener(details => {
    // Don't count redirects more than once.
    let reqs = gTabRequests[details.tabId];
    if (!reqs) return;
    let req = reqs[details.requestId];
    if (req) return;
    req = reqs[details.requestId] = {status: 0};
    req.message = {
      type: "connectingTo",
      url: new URL(details.url).host
    }
    gTabRequests[details.tabId] = reqs;
    updateTabProgress(details, progress => {
      progress.message = req.message;
      progress.progressMax += 3;
    });
  }, {urls: URL_FILTERS});

  chrome.webRequest.onAuthRequired.addListener(
    justUpdateMessage("authenticating"),
    {urls: URL_FILTERS});
  chrome.webRequest.onBeforeRedirect.addListener(
    justUpdateMessage("redirectingTo", "redirectUrl"),
    {urls: URL_FILTERS});
  chrome.webRequest.onSendHeaders.addListener(
    progressState(1, "waitingFor"),
    {urls: URL_FILTERS});
  chrome.webRequest.onResponseStarted.addListener(
    progressState(2, "downloadingFrom"),
    {urls: URL_FILTERS});

  function onRequestDone(details) {
    let reqs = gTabRequests[details.tabId];
    if (!reqs) return;
    delete(reqs[details.requestId]);
    let reqKeys = Object.keys(reqs),
        lastReq = reqKeys[reqKeys.length-1],
        msg = lastReq ? reqs[lastReq].message : null;
    updateTabProgress(details, progress => {
      progress.message = msg;
      ++progress.progress;
    });
  }
  chrome.webRequest.onCompleted.addListener(
    onRequestDone, {urls: URL_FILTERS});
  chrome.webRequest.onErrorOccurred.addListener(
    onRequestDone, {urls: URL_FILTERS});

  // Convenience methods used by the above.
  function progressState(stateNum, stateText) {
    return details => {
      let reqs = gTabRequests[details.tabId];
      if (!reqs) return;
      let req = reqs[details.requestId];
      if (!req || req.status > stateNum) return;
      req.status = stateNum;
      req.message = {
        type: stateText,
        url: new URL(details.url).host
      };
      updateTabProgress(details, progress => {
        progress.message = req.message;
        ++progress.progress;
      });
    }
  }

  function justUpdateMessage(stateText, urlFieldToUse) {
    return details => {
      let reqs = gTabRequests[details.tabId];
      if (!reqs) return;
      let req = reqs[details.requestId];
      if (!req) return;
      req.messages = {
        type: stateText,
        url: new URL(details[urlFieldToUse] || "url").host
      };
      updateTabProgress(details, progress => {
        progress.message = req.message;
      });
    }
  }

  function updateTabProgress(details, callback) {
    let tabId = details.tabId,
        progress = gTabProgress[tabId];

    if (progress) {
      if (callback) {
        callback(progress);
        gTabProgress[tabId] = progress;
      }

      // don't bother updating the tab's toolbar if it's inactive
      if (gActiveWindowTabs[details.windowId] === tabId) {
        chrome.tabs.sendMessage(tabId, {tab_load_progress_update: progress});
      }
    }
  }
})();

