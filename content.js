/**
 * Content Script: The Bridge
 * Natively passes explicit events between dashboard and extension
 */

function syncAuth() {
    // Only fetch if we are explicitly on the dashboard domain platform
    if (window.location.hostname !== 'streamlink.cloud' && window.location.hostname !== 'www.streamlink.cloud') {
        return;
    }

    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('user_email');

    // ONLY write data if it actually exists. Never clear automatically!
    if (token && email) {
        chrome.storage.local.set({ 
            auth_token: token, 
            user_email: email 
        }, () => {
            console.log("StreamLink: Token hooked into extension storage.");
        });
    }
}

// 1. Sync on base load context
syncAuth();

// 2. Listen for mutations (when they log in)
window.addEventListener('storage', (e) => {
    if (e.key === 'auth_token' || e.key === 'user_email') {
        syncAuth();
    }
});

// 3. 🎯 THE CLEARING BRIDGE: Listen for an explicit "LOGOUT_EVENT" from your webpage
window.addEventListener("message", (event) => {
    // Only trust messages coming from your own web dashboard window
    if (event.source !== window) return;

    if (event.data && event.data.type === "STREAMLINK_LOGOUT") {
        console.log("StreamLink: Explicit manual logout broadcast detected.");
        chrome.storage.local.remove(['auth_token', 'user_email'], () => {
            console.log("StreamLink: Extension cache cleared successfully.");
        });
    }
});