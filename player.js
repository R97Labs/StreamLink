const params = new URLSearchParams(window.location.search);
const streamUrl = params.get("url");
const fallbackPageUrl = params.get("fallback") || "https://streamlink.cloud";

const video = document.getElementById("video-element");
const videoWrapper = document.getElementById("video-wrapper");
const header = document.getElementById("header");
const controls = document.getElementById("controls");
const container = document.getElementById("container");

// Elements changing icons dynamically
const playIcon = document.getElementById("play-icon");
const volumeIcon = document.getElementById("volume-icon");

// Control Actions
const playBtn = document.getElementById("play-btn");
const rewindBtn = document.getElementById("rewind-btn");
const forwardBtn = document.getElementById("forward-btn");
const volumeBtn = document.getElementById("volume-btn");
const volumeSlider = document.getElementById("volume-slider");
const fsBtn = document.getElementById("fs-btn");
const exitBtn = document.getElementById("exit-btn");

// Track bars
const timelineRail = document.getElementById("timeline");
const progress = document.getElementById("progress");
const bufferProgress = document.getElementById("buffer-progress");
const currentTimeEl = document.getElementById("current-time");
const totalTimeEl = document.getElementById("total-time");

let lastVolume = 1;

// SVG Path Dictionary for clean switching
const SVG_PATHS = {
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
  mute: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
  lowVolume: '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>',
  highVolume: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>'
};

if (streamUrl) {
  video.src = streamUrl;
  container.focus();

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlay = () => {
    if (video.paused) {
      video.play();
      playIcon.innerHTML = SVG_PATHS.pause;
    } else {
      video.pause();
      playIcon.innerHTML = SVG_PATHS.play;
    }
    resetControlsTimeout();
  };

  const skip = (amount) => {
    video.currentTime = Math.min(Math.max(0, video.currentTime + amount), video.duration || 0);
    resetControlsTimeout();
  };

  const handleVolumeChange = (newVolume) => {
    video.volume = newVolume;
    volumeSlider.value = newVolume;
    
    if (newVolume === 0) {
      volumeIcon.innerHTML = SVG_PATHS.mute;
    } else if (newVolume < 0.5) {
      volumeIcon.innerHTML = SVG_PATHS.lowVolume;
    } else {
      volumeIcon.innerHTML = SVG_PATHS.highVolume;
    }
    if (newVolume > 0) lastVolume = newVolume;
    resetControlsTimeout();
  };

  const toggleMute = () => {
    if (video.volume > 0) {
      handleVolumeChange(0);
    } else {
      handleVolumeChange(lastVolume || 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
    resetControlsTimeout();
  };

  const exitTheaterMode = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    video.pause();
    video.src = "";
    window.top.location.href = fallbackPageUrl; 
  };

  // 🎯 Click on Main Screen to Play/Pause
  videoWrapper.onclick = (e) => {
    // Prevent pausing when double clicking to trigger fullscreen native hooks
    if (e.detail === 1) {
      togglePlay();
    }
  };
  
  // Double-click screen gesture shortcuts for Fullscreen
  videoWrapper.ondblclick = toggleFullscreen;

  // Control Actions Wire-up
  playBtn.onclick = togglePlay;
  rewindBtn.onclick = () => skip(-10);
  forwardBtn.onclick = () => skip(10);
  volumeBtn.onclick = toggleMute;
  fsBtn.onclick = toggleFullscreen;
  exitBtn.onclick = exitTheaterMode;

  volumeSlider.oninput = (e) => handleVolumeChange(parseFloat(e.target.value));

  // Time Scrubbing Tracker
  timelineRail.onclick = (e) => {
    const rect = timelineRail.getBoundingClientRect();
    const clickPercentage = (e.clientX - rect.left) / rect.width;
    if (video.duration) video.currentTime = clickPercentage * video.duration;
  };

  video.addEventListener("timeupdate", () => {
    if (video.duration) {
      progress.style.width = `${(video.currentTime / video.duration) * 100}%`;
      currentTimeEl.innerText = formatTime(video.currentTime);
    }
  });

  // Accurate Buffer Processing
  const updateBuffer = () => {
    if (video.buffered.length > 0 && video.duration) {
      const currentPlayTime = video.currentTime;
      let activeBufferIndex = 0;

      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= currentPlayTime && video.buffered.end(i) >= currentPlayTime) {
          activeBufferIndex = i;
          break;
        }
      }
      const bufferedEnd = video.buffered.end(activeBufferIndex);
      bufferProgress.style.width = `${(bufferedEnd / video.duration) * 100}%`;
    }
  };
  video.addEventListener("progress", updateBuffer);
  video.addEventListener("timeupdate", updateBuffer);

  video.addEventListener("loadedmetadata", () => {
    totalTimeEl.innerText = formatTime(video.duration);
  });

  // Keyboard Controller
  const handleKeyboard = (e) => {
    switch (e.key) {
      case " ":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        e.preventDefault();
        skip(-10);
        break;
      case "ArrowRight":
        e.preventDefault();
        skip(10);
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "m":
      case "M":
        e.preventDefault();
        toggleMute();
        break;
      case "ArrowUp":
        e.preventDefault();
        handleVolumeChange(Math.min(1, video.volume + 0.05));
        break;
      case "ArrowDown":
        e.preventDefault();
        handleVolumeChange(Math.max(0, video.volume - 0.05));
        break;
      case "Escape":
        e.preventDefault();
        exitTheaterMode();
        break;
    }
  };
  window.addEventListener("keydown", handleKeyboard);

  // Auto-fading Controls Setup
  let fadeTimeout;
  function resetControlsTimeout() {
    header.classList.remove("hide-ui");
    controls.classList.remove("hide-ui");
    container.style.cursor = "default";
    clearTimeout(fadeTimeout);
    if (!video.paused) {
      fadeTimeout = setTimeout(() => {
        header.classList.add("hide-ui");
        controls.classList.add("hide-ui");
        container.style.cursor = "none";
      }, 3000);
    }
  }
  container.onmousemove = resetControlsTimeout;
  video.onplay = resetControlsTimeout;
  video.onpause = resetControlsTimeout;
}