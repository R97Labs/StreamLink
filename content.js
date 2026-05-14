/**
 * Content Script: The Bridge
 * Automatically syncs website login to extension storage
 */
function syncAuth() {
    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('user_email');

    if (token && email) {
        chrome.storage.local.set({ 
            auth_token: token, 
            user_email: email 
        }, () => {
            console.log("StreamLink: Auth synced from dashboard.");
        });
    } else {
        // If user logs out of the website, clear extension storage too
        chrome.storage.local.remove(['auth_token', 'user_email']);
    }
}

// 1. Sync immediately on load
syncAuth();

// 2. Listen for changes (in case they log in without refreshing)
window.addEventListener('storage', (e) => {
    if (e.key === 'auth_token' || e.key === 'user_email') {
        syncAuth();
    }
});