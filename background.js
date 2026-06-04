const PROXY_URL = "https://api.streamlink.cloud"; // 🚀 Update this

chrome.runtime.onInstalled.addListener(() => {
  // Set default player to extension on install if not already set
  chrome.storage.local.get(["defaultPlayer"], (data) => {
    if (!data.defaultPlayer) {
      chrome.storage.local.set({ defaultPlayer: "extension" });
    }
  });

  // Existing Play Button
  chrome.contextMenus.create({
    id: "stream",
    title: "Play with Streamlink",
    contexts: ["link"]
  });

  // 🚀 NEW: Auto-Save Button
  chrome.contextMenus.create({
    id: "save_drive",
    title: "Save to StreamLink Drive",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.linkUrl) return;

  // ─── FLOW 1: EXISTING INSTANT PLAY LOGIC ───
  if (info.menuItemId === "stream") {
    showToast(tab.id, "Searching for stream...");

    try {
      const settings = await chrome.storage.local.get(["defaultPlayer"]);
      const defaultPlayer = settings.defaultPlayer || "extension";

      const streamData = await getWorkerStream(info.linkUrl);

      if (!streamData) {
        showToast(tab.id, "⚠️ Connection error.");
        triggerBadgeError();
        return;
      }

      if (streamData.message) {
        showToast(tab.id, streamData.message);
      }

      if (streamData.error === "PREMIUM_REQUIRED" || streamData.status === "retry") {
        if (streamData.error) triggerBadgeError();
        return;
      }

      if (streamData.url) {
        const streamUrl = streamData.url;
        
        if (defaultPlayer === "browser") {
          const websiteUrl = `https://streamlink.cloud/streaming?url=${encodeURIComponent(streamUrl)}`;
          chrome.tabs.create({ url: websiteUrl });
          
        } else if (defaultPlayer === "extension") {
          try {
            const targetTab = await chrome.tabs.get(tab.id);
            if (!targetTab) throw new Error("Tab no longer exists");

            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["injectPlayer.js"]
            });

            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "loadStream", url: streamUrl })
                .catch(err => console.log("Message intercepted or tab closed: ", err));
            }, 100);

          } catch (err) {
            console.error("Context mapping restriction or Tab missing: ", err);
            showToast(tab.id, "⚠️ In-page block. Opening in Web Player instead.");
            const websiteUrl = `https://streamlink.cloud/streaming?url=${encodeURIComponent(streamUrl)}`;
            chrome.tabs.create({ url: websiteUrl });
          }
          
        } else {
          const helperUrl = chrome.runtime.getURL(`helper.html?url=${encodeURIComponent(streamUrl)}&player=${defaultPlayer}`);
          chrome.tabs.create({ url: helperUrl });
        }
      }

    } catch (e) {
      showToast(tab.id, "⚠️ Extension Error.");
      triggerBadgeError();
      console.error(e);
    }
  }

  // ─── FLOW 2: 🚀 NEW HEADLESS AUTO-SAVE LOGIC ───
  if (info.menuItemId === "save_drive") {
    showToast(tab.id, "Saving to Drive...");

    try {
      const { auth_token } = await chrome.storage.local.get("auth_token");
      
      if (!auth_token) {
        showToast(tab.id, "⚠️ Please login to the extension first.");
        triggerBadgeError();
        return;
      }

      // Hit the new Headless Auto-Save API
      const response = await fetch(`${PROXY_URL}/api/?url=${encodeURIComponent(info.linkUrl)}&action=auto-save`, {
        headers: { "Authorization": `Bearer ${auth_token}` }
      });

      const data = await response.json();

      if (data.success) {
        // Show success message with file count!
        showToast(tab.id, `✅ ${data.message}`);
      } else {
        // If Gatekeeper blocks it, show the exact reason (e.g. "File too large...")
        showToast(tab.id, data.message || data.error || "⚠️ Failed to save to Drive.");
        triggerBadgeError();
      }

    } catch (e) {
      showToast(tab.id, "⚠️ Network Error while saving.");
      triggerBadgeError();
      console.error(e);
    }
  }
});

/**
 * Communicates with Cloudflare Worker for Streaming
 */
async function getWorkerStream(url) {
  try {
    const { auth_token } = await chrome.storage.local.get("auth_token");

    const response = await fetch(`${PROXY_URL}/api/?url=${encodeURIComponent(url)}`, {
      headers: {
        "Authorization": auth_token ? `Bearer ${auth_token}` : ""
      }
    });

    return await response.json();
  } catch (error) {
    console.error("Fetch failed:", error);
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
        position: 'fixed', bottom: '30px', right: '30px', background: 'rgba(28, 28, 30, 0.95)',
        color: '#ffffff', padding: '14px 24px', borderRadius: '12px', zIndex: '2147483647',
        fontSize: '14px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        borderLeft: `4px solid ${isError ? '#FF3B30' : '#0a84ff'}`, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', transform: 'translateY(20px)', opacity: '0'
      });
      document.body.appendChild(toast);
      requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
      setTimeout(() => {
        toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },
    args: [message]
  });
}