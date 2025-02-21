<template>
  <div ref="videoContainer" class="video-container">
    <video ref="videoElement" class="fullscreen-video" autoplay muted playsinline controls></video>
  </div>
</template>

<script>
export default {
  name: 'FullscreenVideoAd',
  data() {
    return {
      uid: null,
      currentAdUrl: "",
      nextAdUrl: "",
      isFetching: false,
      offlineRefreshInterval: null,
      cacheName: 'video-cache' // 🔥 Add a cache name
    };
  },
  mounted() {
    // Retrieve UID from cookie; if absent, redirect to /serve_ad/register_device.
    this.uid = this.getCookie("uid");
    if (!this.uid) {
      window.location.href = '/serve_ad/register_device';
      return;
    }

    // Fetch and play the initial advertisement, then prefetch the next.
    this.fetchAd().then(url => {
      if (url) {
        this.currentAdUrl = url;
        this.playAd(this.currentAdUrl);
        this.prefetchNextAd();
      }
    });

    // Video event listeners.
    const video = this.$refs.videoElement;
    video.addEventListener('ended', this.onVideoEnded);
    video.addEventListener('loadedmetadata', this.onLoadedMetadata);

    // Focus reporting.
    window.addEventListener('focus', () => {
      this.reportFocus(true);
    });
    window.addEventListener('blur', () => {
      this.reportFocus(false);
    });

    // Refresh when offline and video is not playing.
    this.offlineRefreshInterval = setInterval(() => {
      const videoEl = this.$refs.videoElement;
      if (!navigator.onLine && videoEl.paused) {
        console.log("No internet and video is not playing. Refreshing page...");
        window.location.reload();
      }
    }, 10000);
  },
  beforeDestroy() {
    const video = this.$refs.videoElement;
    video.removeEventListener('ended', this.onVideoEnded);
    video.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    window.removeEventListener('focus', () => this.reportFocus(true));
    window.removeEventListener('blur', () => this.reportFocus(false));

    if (this.offlineRefreshInterval) {
      clearInterval(this.offlineRefreshInterval);
    }
  },
  methods: {
    /**
     * Retrieve the value of a specified cookie.
     */
    getCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
      }
      return null;
    },

    /**
     * Fetch an advertisement, checking the cache first.
     */
    async fetchAd() {
      const url = 'https://ds.manager.indigoingenium.ba/get_ad';
      const payload = { uuid: this.uid };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.name === 'Redirection') {
          window.location.href = '/serve_ad/register_device';
          return null;
        } else if (data.name === 'Advertisement') {
          const videoUrl = data.url;

          // 🔥 Check and cache the ad
          const cachedUrl = await this.cacheAd(videoUrl);
          return cachedUrl;
        }
      } catch (error) {
        console.error('Error fetching ad:', error);
        return null;
      }
    },

    /**
     * Cache the advertisement video and return the cached URL.
     */
    async cacheAd(videoUrl) {
      if (!('caches' in window)) {
        console.warn('Cache API not supported.');
        return videoUrl;
      }

      try {
        const cache = await caches.open(this.cacheName);
        const cachedResponse = await cache.match(videoUrl);

        if (cachedResponse) {
          console.log('Loaded video from cache:', videoUrl);
          const videoBlob = await cachedResponse.blob();
          return URL.createObjectURL(videoBlob);
        } else {
          const response = await fetch(videoUrl, { mode: 'cors' });
          if (response.ok) {
            await cache.put(videoUrl, response.clone());
            console.log('Video cached:', videoUrl);
            const videoBlob = await response.blob();
            return URL.createObjectURL(videoBlob);
          } else {
            console.warn('Failed to fetch and cache video.');
            return videoUrl;
          }
        }
      } catch (err) {
        console.error('Cache error:', err);
        return videoUrl;
      }
    },

    /**
     * Prefetch and cache the next advertisement.
     */
    prefetchNextAd() {
      if (this.isFetching) return;
      this.isFetching = true;
      this.fetchAd().then(url => {
        if (url) {
          this.nextAdUrl = url;
          console.log('Prefetched next ad:', this.nextAdUrl);
        }
        this.isFetching = false;
      });
    },

    /**
     * Play the advertisement video from the provided URL.
     */
    playAd(url) {
      if (!url) return;
      const video = this.$refs.videoElement;
      video.pause();
      video.src = url;
      video.load();
      video.play().catch(err => console.error('Error playing video:', err));
    },

    /**
     * Handle video 'ended' event: Play the next ad or fetch a new one.
     */
    onVideoEnded() {
      if (this.nextAdUrl) {
        this.currentAdUrl = this.nextAdUrl;
        this.nextAdUrl = "";
        this.playAd(this.currentAdUrl);
        this.prefetchNextAd();
      } else {
        this.fetchAd().then(url => {
          if (url) {
            this.currentAdUrl = url;
            this.playAd(this.currentAdUrl);
            this.prefetchNextAd();
          }
        });
      }
    },

    /**
     * Once video metadata is loaded, request full screen.
     */
    onLoadedMetadata() {
      if (!document.fullscreenElement) {
        this.requestFullScreen();
      }
    },

    /**
     * Request full screen on the video container.
     */
    requestFullScreen() {
      const container = this.$refs.videoContainer;
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(console.error);
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    },

    /**
     * Report focus state to the server.
     */
    reportFocus(isFocused) {
      const reportUrl = 'https://ds.manager.indigoingenium.ba/report_focus';
      const payload = {
        uuid: this.uid,
        date: new Date().toISOString(),
        is_in_focus: isFocused ? 1 : 0
      };
      fetch(reportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(error => {
        console.error('Error reporting focus:', error);
      });
    }
  }
};
</script>

<!-- Global Styles -->
<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f9f9f9;
}
</style>

<!-- Component Scoped Styles -->
<style scoped>
.video-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #f9f9f9;
  z-index: 9999;
}
.fullscreen-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #f9f9f9;
}
</style>
