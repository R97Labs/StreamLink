const PROXY_URL = "https://api.streamlink.cloud"; // 🚀 Update this

chrome.runtime.onInstalled.addListener(() => {
  // Set default player to extension on install if not already set
  chrome.storage.local.get(["defaultPlayer"], (data) => {
    if (!data.defaultPlayer) {
      chrome.storage.local.set({ defaultPlayer: "extension" });
    }
  });

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
    const defaultPlayer = settings.defaultPlayer || "extension";

    // 1. Fetch data from Worker (Includes Auth, Size check, and Message strings)
    const streamData = await getWorkerStream(info.linkUrl);

    if (!streamData) {
      showToast(tab.id, "⚠️ Connection error.");
      triggerBadgeError();
      return;
    }

    // 2. Display the message sent from Cloudflare (Success, Retry, or Limit)
    if (streamData.message) {
      showToast(tab.id, streamData.message);
    }

    // 3. Stop if it's a block or a retry
    if (streamData.error === "PREMIUM_REQUIRED" || streamData.status === "retry") {
      if (streamData.error) triggerBadgeError();
      return;
    }

    /// 4. Launch Player on Success
    if (streamData.url) {
      const streamUrl = streamData.url;
      
      if (defaultPlayer === "browser") {
        // 🌐 StreamLink Website: Opens in a NEW tab
        const websiteUrl = `https://streamlink.cloud/streaming?url=${encodeURIComponent(streamUrl)}`;
        chrome.tabs.create({ url: websiteUrl });
        
      } else if (defaultPlayer === "extension") {
        // 🚀 Extension Player: Injects safely into the SAME tab
        try {
          // Double check that the tab context is still alive to prevent "No tab with id" crashes
          const targetTab = await chrome.tabs.get(tab.id);
          if (!targetTab) throw new Error("Tab no longer exists");

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["injectPlayer.js"]
          });

          // Allow a brief window for execution environment mapping before sending URL
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: "loadStream", url: streamUrl })
              .catch(err => console.log("Message intercepted or tab closed: ", err));
          }, 100);

        } catch (err) {
          console.error("Context mapping restriction or Tab missing: ", err);
          // Bulletproof Fallback: Open in web player if script environment injection is blocked
          showToast(tab.id, "⚠️ In-page block. Opening in Web Player instead.");
          const websiteUrl = `https://streamlink.cloud/streaming?url=${encodeURIComponent(streamUrl)}`;
          chrome.tabs.create({ url: websiteUrl });
        }
        
      } else {
        // External native players (e.g., IINA)
        const helperUrl = chrome.runtime.getURL(`helper.html?url=${encodeURIComponent(streamUrl)}&player=${defaultPlayer}`);
        chrome.tabs.create({ url: helperUrl });
      }
    }

  } catch (e) {
    showToast(tab.id, "⚠️ Extension Error.");
    triggerBadgeError();
    console.error(e);
  }
});

/**
 * Communicates with Cloudflare Worker
 */
async function getWorkerStream(url) {
  try {
    const { auth_token } = await chrome.storage.local.get("auth_token");

    const response = await fetch(`${PROXY_URL}/?url=${encodeURIComponent(url)}`, {
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