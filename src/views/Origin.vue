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
        isFetching: false
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
       * If a redirection or registration condition is met, the browser is redirected.
       */
      fetchAd() {
        const url = 'https://ds.manager.indigoingenium.ba/get_ad';
        const payload = { uuid: this.uid };
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
          if (data.name === 'Redirection') {
            window.location.href = '/serve_ad/register_device';
            return null;
          } else if (data.name === 'Advertisement') {
            const dataString = JSON.stringify(data).toLowerCase();
            if (dataString.indexOf('ds.manager') !== -1) {
              window.location.href = '/serve_ad/register_device';
              return null;
            } else {
              return data.url;
            }
          }
          return null;
        })
        .catch(error => {
          console.error('Error fetching ad:', error);
          return null;
        });
      },
  
      /**
       * Prefetch the next advertisement.
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
       * Handle video 'ended' event:
       * Play the prefetched ad if available, otherwise fetch a new ad.
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
  