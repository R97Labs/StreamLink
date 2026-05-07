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