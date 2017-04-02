let height = "3vmin", // Use vh/vmin units to be unaffected by page zoom
    frameStyles = {
      height:height,
      position:"fixed",
      left:0,
      bottom:0,
      width:"100%",
      margin:0,
      padding:0,
      zIndex:1000000,
    },
    iframe;



// Add our toolbar to the top-level frame
if (window === top) {
  iframe = document.createElement("iframe");
  iframe.src = chrome.extension.getURL("toolbar/iframe.html");
  iframe.setAttribute("frameborder", 0);
  // Apply iframe styles to only our toolbar iframe.
  for(let [key, val] of Object.entries(frameStyles)) {
    iframe.style[key] = val;
  }
  // Adjust the rest of the page to accomodate our toolbar iframe
  // (note it's always on the bottom right now).
  chrome.runtime.sendMessage({injectCSS: `
    html {
      overflow:hidden;
      height:100%;
      margin:0;
      min-width:100%;
    }
    body {
      overflow:auto;
      min-width:100%;
      margin:0;
      min-height:calc(100% - ${height});
      max-height:calc(100% - ${height});
    }
  `});
  document.documentElement.appendChild(iframe);
}



// Detect when the addon is disabled/uninstalled by connecting a
// port but doing nothing with it but listening for it to disconnect.
// This way we can remove our iframe from all tabs when the addon is
// disabled/uninstalled/restarted.
let port = chrome.runtime.connect({name:"toolbarIFramePort"});
port.onDisconnect.addListener(() => {
  if (iframe) {
    iframe.parentNode.removeChild(iframe);
  }
});

