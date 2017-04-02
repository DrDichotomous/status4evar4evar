"use strict";



// Detect when the user hovers over a link, and send a message to the
// iframe (via the background script) to update the status text.
document.documentElement.addEventListener("mouseenter", e => {
  let link = e.target.closest("a");
  chrome.runtime.sendMessage({
    toolbar_href_update: link && link.href
  });
}, true);



// Detect mouseleave too, since scrolling over the HTML
// element will not always send a mouseenter event.
document.documentElement.addEventListener("mouseleave", e => {
  chrome.runtime.sendMessage({
    toolbar_href_update: false
  });
}, true);

