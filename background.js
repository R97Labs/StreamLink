const PROXY_URL = "https://streamlink.r97group.workers.dev";
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB Limit

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "stream",
    title: "Play with Streamlink",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "stream" || !info.linkUrl) return;

  showToast(tab.id, "Searching for stream...");

  try {
    const settings = await chrome.storage.local.get(["defaultPlayer"]);
    const defaultPlayer = settings.defaultPlayer || "iina";

    const streamUrl = await getOffcloudStream(info.linkUrl);

    if (!streamUrl) {
      showToast(tab.id, "❌ No video stream found.");
      triggerBadgeError();
      return;
    }

    // Check file size
    showToast(tab.id, "Checking file size...");
    const fileSize = await getFileSize(streamUrl);
    
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      // Calculate dynamic size in GB
      const sizeGB = (fileSize / (1024 ** 3)).toFixed(2);
      showToast(tab.id, `❌ File too large: ${sizeGB}GB (Limit 1GB)`);
      triggerBadgeError();
      return;
    }

    // Launch Player
    if (defaultPlayer === "browser") {
      const playerUrl = chrome.runtime.getURL(`player.html?url=${encodeURIComponent(streamUrl)}`);
      chrome.tabs.create({ url: playerUrl });
    } else {
      const helperUrl = chrome.runtime.getURL(`helper.html?url=${encodeURIComponent(streamUrl)}&player=${defaultPlayer}`);
      chrome.tabs.create({ url: helperUrl });
    }
  } catch (e) {
    showToast(tab.id, "⚠️ Connection error.");
    triggerBadgeError();
    console.error("StreamLink Error:", e);
  }
});

/**
 * Uses a HEAD request to check the 'content-length' header
 */
async function getFileSize(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const size = response.headers.get("content-length");
    return size ? parseInt(size, 10) : null;
  } catch (e) {
    console.warn("Could not determine file size:", e);
    return null; 
  }
}

async function getOffcloudStream(url) {
  try {
    const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const videoRegex = /\.(mp4|mkv|avi|mov|m4v|flv|webm|wmv)($|\?|&)/i;
      return data.find(link => videoRegex.test(link)) || null;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function triggerBadgeError() {
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF3B30" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 4000);
}

function showToast(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (msg) => {
      const existing = document.getElementById('streamlink-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'streamlink-toast';
      toast.textContent = msg;
      
      const isError = msg.includes("❌") || msg.includes("⚠️");
      
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        background: 'rgba(28, 28, 30, 0.95)',
        color: '#ffffff',
        padding: '14px 24px',
        borderRadius: '12px',
        zIndex: '2147483647',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        borderLeft: `4px solid ${isError ? '#FF3B30' : '#0a84ff'}`,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        transform: 'translateY(20px)',
        opacity: '0'
      });

      document.body.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
      });

      setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },
    args: [message]
  });
}