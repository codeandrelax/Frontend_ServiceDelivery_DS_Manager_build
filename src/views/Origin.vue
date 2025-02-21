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
      cacheName: 'video-cache' // Name for your Cache Storage
    };
  },
  mounted() {
    // 1️⃣ Clean up any expired ads (older than 30 days) on component load
    this.cleanExpiredCache()
      .then(() => this.enforceMaxCacheSize()) // Also enforce 2GB limit
      .catch(err => console.error('Cleanup error on mount:', err));

    // 2️⃣ Retrieve UID from cookie; if absent, redirect to /serve_ad/register_device
    this.uid = this.getCookie("uid");
    if (!this.uid) {
      window.location.href = '/serve_ad/register_device';
      return;
    }

    // 3️⃣ Fetch and play the initial advertisement, then prefetch the next
    this.fetchAd().then(url => {
      if (url) {
        this.currentAdUrl = url;
        this.playAd(this.currentAdUrl);
        this.prefetchNextAd();
      }
    });

    // 4️⃣ Video event listeners
    const video = this.$refs.videoElement;
    video.addEventListener('ended', this.onVideoEnded);
    video.addEventListener('loadedmetadata', this.onLoadedMetadata);

    // 5️⃣ Focus reporting
    window.addEventListener('focus', () => {
      this.reportFocus(true);
    });
    window.addEventListener('blur', () => {
      this.reportFocus(false);
    });

    // 6️⃣ If offline & video is not playing, refresh page every 10 seconds
    this.offlineRefreshInterval = setInterval(() => {
      const videoEl = this.$refs.videoElement;
      if (!navigator.onLine && videoEl.paused) {
        console.log("No internet and video is not playing. Refreshing page...");
        window.location.reload();
      }
    }, 10000);
  },
  beforeDestroy() {
    // Remove video event listeners
    const video = this.$refs.videoElement;
    video.removeEventListener('ended', this.onVideoEnded);
    video.removeEventListener('loadedmetadata', this.onLoadedMetadata);

    // Remove focus/blur event listeners
    window.removeEventListener('focus', () => {
      this.reportFocus(true);
    });
    window.removeEventListener('blur', () => {
      this.reportFocus(false);
    });

    // Clear the offline refresh interval
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
     * Fetch an advertisement from the server.
     * Returns a Blob URL if cached, otherwise the original URL.
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

          // Cache the ad and return a Blob URL if successful
          const cachedUrl = await this.cacheAd(videoUrl);
          return cachedUrl;
        }
        return null;
      } catch (error) {
        console.error('Error fetching ad:', error);
        return null;
      }
    },

    /**
     * Cache the video, set a 30-day expiration timestamp, and enforce a 2GB size limit.
     * Returns a local Blob URL if successful, or the original URL if caching fails.
     */
    async cacheAd(videoUrl) {
      if (!('caches' in window)) {
        console.warn('Cache API not supported.');
        return videoUrl;
      }

      try {
        const cache = await caches.open(this.cacheName);
        const cachedResponse = await cache.match(videoUrl);

        // Check if we already have a cached version
        if (cachedResponse) {
          // Check expiration
          const isExpired = this.isCacheExpired(videoUrl);
          if (!isExpired) {
            console.log('Loaded video from cache:', videoUrl);
            const videoBlob = await cachedResponse.blob();
            return URL.createObjectURL(videoBlob);
          } else {
            // Remove expired entry
            console.log('Cache expired, removing:', videoUrl);
            await cache.delete(videoUrl);
            localStorage.removeItem(`cache-timestamp-${videoUrl}`);
          }
        }

        // Fetch fresh video if not cached or expired
        const response = await fetch(videoUrl, { mode: 'cors' });
        if (!response.ok) {
          console.warn('Failed to fetch and cache video.');
          return videoUrl;
        }

        await cache.put(videoUrl, response.clone());
        console.log('Video cached:', videoUrl);

        // Store creation timestamp for 30-day expiration
        localStorage.setItem(`cache-timestamp-${videoUrl}`, Date.now().toString());

        // Enforce 2GB limit
        await this.enforceMaxCacheSize();

        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
      } catch (err) {
        console.error('Cache error:', err);
        return videoUrl;
      }
    },

    /**
     * Check if the cached video is older than 30 days.
     */
    isCacheExpired(videoUrl) {
      const timestamp = localStorage.getItem(`cache-timestamp-${videoUrl}`);
      if (!timestamp) return true; // No timestamp => treat as expired

      const now = Date.now();
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
      return (now - Number(timestamp)) > THIRTY_DAYS;
    },

    /**
     * Remove all ads older than 30 days from the cache.
     */
    async cleanExpiredCache() {
      if (!('caches' in window)) return;

      try {
        const cache = await caches.open(this.cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const url = request.url;
          if (this.isCacheExpired(url)) {
            console.log('Removing expired cached ad:', url);
            await cache.delete(request);
            localStorage.removeItem(`cache-timestamp-${url}`);
          }
        }
      } catch (err) {
        console.error('Error cleaning expired cache:', err);
      }
    },

    /**
     * Enforce a maximum cache size of 2 GB.
     * If over 2GB, remove oldest entries (based on timestamp) until under 2GB.
     */
    async enforceMaxCacheSize() {
      if (!('caches' in window)) return;

      try {
        const MAX_CACHE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB in bytes
        const cache = await caches.open(this.cacheName);
        const requests = await cache.keys();

        // Gather total size + timestamps
        let totalSize = 0;
        const entries = [];

        for (const request of requests) {
          const response = await cache.match(request);
          if (!response) continue;

          const blob = await response.blob();
          const size = blob.size;
          totalSize += size;

          const url = request.url;
          const timestampStr = localStorage.getItem(`cache-timestamp-${url}`);
          const timestamp = timestampStr ? Number(timestampStr) : 0;

          entries.push({ url, size, timestamp });
        }

        // If we're within limit, nothing to do
        if (totalSize <= MAX_CACHE_SIZE) {
          return;
        }

        console.warn(`Cache size (${(totalSize / (1024*1024)).toFixed(2)} MB) exceeds 2 GB. Cleaning up...`);

        // Sort by oldest creation timestamp first
        entries.sort((a, b) => a.timestamp - b.timestamp);

        // Remove oldest until we're under 2 GB
        let index = 0;
        while (totalSize > MAX_CACHE_SIZE && index < entries.length) {
          const entry = entries[index];
          console.log('Removing to enforce 2GB limit:', entry.url);
          await cache.delete(entry.url);
          localStorage.removeItem(`cache-timestamp-${entry.url}`);
          totalSize -= entry.size;
          index++;
        }

        console.log(`Cache cleanup done. Current size: ${(totalSize / (1024*1024)).toFixed(2)} MB`);
      } catch (err) {
        console.error('Error enforcing max cache size:', err);
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
     * Play the advertisement video from the provided URL (Blob or network).
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
     * Once the current video ends, play the next ad or fetch a new one,
     * then clean up expired ads and enforce size limits.
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

      // Clean up expired ads + enforce 2GB limit after each commercial
      this.cleanExpiredCache()
        .then(() => this.enforceMaxCacheSize())
        .catch(err => console.error('Cleanup error after video ended:', err));
    },

    /**
     * Once video metadata is loaded, attempt to request full screen.
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
     * Report the focus state to the server.
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
