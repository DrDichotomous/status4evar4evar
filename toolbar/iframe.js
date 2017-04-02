"use strict";


// Just wait for messages sent to inform us to update our page load/
// download progress meter or the status text (all sent through the
// background script, directly or indirectly).
let toolbarItems = document.querySelectorAll("toolbaritem"),
    toolbarStatusText = toolbarItems[0],
    toolbarTabProgress = toolbarItems[1],
    tabText = toolbarTabProgress.querySelector("span"),
    tabMeter = toolbarTabProgress.querySelector("progress"),
    toolbarDownloads = toolbarItems[2],
    downloadText = toolbarDownloads.querySelector("span"),
    downloadMeter = toolbarDownloads.querySelector("progress");

chrome.runtime.onMessage.addListener(msg => {
  if (msg.download_status_update) {  
    let status = msg.download_status_update;
    if (status.numDownloading < 1) {
      downloadMeter.style.display = "none";
      downloadText.innerText = "";
    } else {
      downloadMeter.style.display = "";
      downloadText.innerText =
        chrome.i18n.getMessage("numDownloads", [status.numDownloading]);
      if (status.unknownSizes) {
        downloadMeter.removeAttribute("value");
      } else {
        downloadMeter.max = status.totalBytes;
        downloadMeter.value = status.receivedBytes;
      }
    }

  } else if (msg.tab_load_progress_update) {
    let status = msg.tab_load_progress_update;
    if (status.message) {
      tabMeter.style.display = "";
      tabText.innerText = chrome.i18n.getMessage(status.message.type,
                                                 status.message.url);
      tabMeter.max = status.progressMax;
      tabMeter.value = status.progress;
    } else {
      tabText.innerText = "";
      if (status.progress === status.progressMax) {
        tabMeter.style.display = "none";
      } else {
        tabMeter.style.display = "";
        tabMeter.max = status.progressMax;
        tabMeter.value = status.progress;
      }
    }

  } else if (msg.toolbar_href_update !== undefined) {
    let statusText = msg.toolbar_href_update;
    toolbarStatusText.style.display = "";
    if (statusText) {
      toolbarStatusText.innerText = statusText;
    } else {
      toolbarStatusText.innerText = "";
    }
  }
});

