(function() {
  // Prevent duplicate injections
  if (document.getElementById("streamlink-theater-overlay")) return;

  // Create a full-screen wrapper
  const overlay = document.createElement("div");
  overlay.id = "streamlink-theater-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "2147483647",
    background: "#000000",
    border: "none",
    margin: "0",
    padding: "0",
    overflow: "hidden"
  });

  // Create the player frame targeting your extension's asset page
  const iframe = document.createElement("iframe");
  iframe.id = "streamlink-player-frame";
  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "none"
  });
  
  // Allow fullscreen requests inside the frame
  iframe.allow = "autoplay; fullscreen"; 

  overlay.appendChild(iframe);
  document.documentElement.appendChild(overlay);

  // Hide the original page scrollbars
  document.body.style.overflow = "hidden";

  // Listen for the stream URL from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "loadStream" && message.url) {
      const playerPage = chrome.runtime.getURL("player.html");
      iframe.src = `${playerPage}?url=${encodeURIComponent(message.url)}&fallback=${encodeURIComponent(window.location.href)}`;
    }
  });
})();