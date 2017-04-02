(function() {
  // Track the progress of downloads (based on the code in the
  // Download Manager Button example Chrome extension).
  let gPollTimer,
      gPollInterval = 250;

  function pollDownloadProgress() {
    chrome.downloads.search({}, function(items) {
      let msg = {
        numDownloading: 0,
        totalBytes: 0,
        receivedBytes: 0,
        unknownSizes: false,
        anyDangerous: false,
        anyPaused: false,
      };
      items.forEach(function(item) {
        if (item.state === "in_progress") {
          ++msg.numDownloading;
          if (item.totalBytes > 0) {
            msg.totalBytes += item.totalBytes;
            msg.receivedBytes += item.bytesReceived;
          } else {
            msg.unknownSizes = true;
          }
          msg.anyDangerous = msg.anyDangerous || ((item.danger != 'safe') &&
                                                  (item.danger != 'accepted'));
          msg.anyPaused = msg.anyPaused || item.paused;
        }
      });
      chrome.tabs.query({currentWindow: true, active: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {download_status_update: msg});
      });
      if (msg.numDownloading) {
        gPollTimer = setTimeout(pollDownloadProgress, gPollInterval);
      }
    });
  }

  chrome.downloads.onCreated.addListener(function(item) {
    if (gPollTimer) {
      clearTimeout(gPollTimer);
    }
    pollDownloadProgress();
  });

  pollDownloadProgress();
})();

