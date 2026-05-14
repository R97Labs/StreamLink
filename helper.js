const params = new URLSearchParams(window.location.search);
const url = params.get("url");

if (url) {
  // Directly use IINA protocol
  const protocol = "iina://open?url=" + encodeURIComponent(url);

  const launch = () => { 
    window.location.href = protocol; 
  };

  // 1. Auto-launch immediately
  launch();

  // 2. Update UI if launch fails
  setTimeout(() => {
    const status = document.getElementById('status');
    const btn = document.getElementById('manual-trigger');
    if (status && btn) {
      status.innerText = "Make sure you installed IINA player. \nIf the player didn't open, click below:";
      btn.style.display = "inline-block";
    }
  }, 1000);

  const manualBtn = document.getElementById('manual-trigger');
  if (manualBtn) {
    manualBtn.onclick = launch;
  }

  // 3. Auto-close for a clean workspace
  window.onblur = () => {
    setTimeout(() => window.close(), 3000);
  };
}