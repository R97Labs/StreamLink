
/**
 * Load saved player preference from storage
 */
chrome.storage.local.get(["defaultPlayer"], (data) => {
  const player = data.defaultPlayer || "iina";
  const radio = document.querySelector(`input[value="${player}"]`);
  if (radio) {
    radio.checked = true;
  }
});

/**
 * Save the player choice immediately when changed
 */
document.querySelectorAll('input[name="player"]').forEach(input => {
  input.addEventListener('change', () => {
    chrome.storage.local.set({ defaultPlayer: input.value });
  });
});
// Existing player logic...

// Update User Status Display
chrome.storage.local.get(["user_email"], (data) => {
  const statusEl = document.getElementById('user-status');
  if (data.user_email) {
    statusEl.innerText = `Logged in as: ${data.user_email}`;
    statusEl.style.color = "#34C759"; // Green
  } else {
    statusEl.innerText = "Not logged in (Guest)";
    statusEl.style.color = "#8e8e93"; // Gray
  }
});