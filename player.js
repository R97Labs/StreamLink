const params = new URLSearchParams(window.location.search);
const streamUrl = params.get("url");

if (streamUrl) {
    const videoElement = document.getElementById("videoPlayer");
    const loader = document.getElementById("loader");
    
    videoElement.src = streamUrl;

    // Remove loading spinner when video is ready
    videoElement.onloadeddata = () => {
        if (loader) loader.classList.add("hidden");
    };

    // Error handling for the video player
    videoElement.onerror = () => {
        if (loader) loader.classList.add("hidden");
        document.body.innerHTML = `<div style="color:white; font-family:sans-serif;">Failed to load video stream.</div>`;
    };
    
    const fileName = streamUrl.split('/').pop().split('?')[0] || "Video Stream";
    document.title = decodeURIComponent(fileName);
}