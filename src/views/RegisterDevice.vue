<template>
    <div class="container">
      <h1>Your UID Cookie</h1>
      <p class="uid">{{ uid }}</p>
      <p class="attempts">Attempt #{{ attemptCount }}</p>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'RegisterDevice',
    setup() {
      const router = useRouter();
      const uid = ref('');
      const attemptCount = ref(0);
      let checkRegistrationTimeout = null;
  
      /**
       * Retrieves a cookie value by name.
       * @param {string} name - The name of the cookie.
       * @returns {string|null} The cookie value, or null if not found.
       */
      const getCookie = (name) => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i].trim();
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
      };
  
      /**
       * Sets a cookie with the specified name, value, and expiration in days.
       * If running on the expected domain, sets the domain attribute.
       * @param {string} name - The cookie name.
       * @param {string} value - The cookie value.
       * @param {number} days - Expiration time in days.
       */
      const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
          const date = new Date();
          date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
          expires = "; expires=" + date.toUTCString();
        }
        let domain = "";
        if (window.location.hostname.endsWith("indigoingenium.ba")) {
          domain = "; domain=.indigoingenium.ba";
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/" + domain;
      };
  
      /**
       * Generates a UID in the format xx:xx:xx:xx:xx:xx using cryptographically secure random bytes.
       * @returns {string} The generated UID.
       */
      const generateUid = () => {
        const array = new Uint8Array(6);
        window.crypto.getRandomValues(array);
        const hexArray = Array.from(array, byte =>
          byte.toString(16).padStart(2, '0')
        );
        return hexArray.join(':').toLowerCase();
      };
  
      // Retrieve the "uid" cookie; if it doesn't exist, generate a new one.
      let cookieUid = getCookie("uid");
      if (!cookieUid) {
        cookieUid = generateUid();
        setCookie("uid", cookieUid, 365);
      }
      uid.value = cookieUid.toLowerCase();
  
      /**
       * Checks if the device is registered by sending a POST request.
       * If registered, navigates to the '/' (Origin) page.
       * Otherwise, retries every 3 seconds.
       */
      const checkRegistration = () => {
        attemptCount.value++;
        const payload = { uuid: uid.value };
        console.log('Checking registration with payload:', payload);
  
        fetch('https://ds.manager.indigoingenium.ba/check_if_registered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(response => response.json())
          .then(data => {
            console.log('Response received:', data);
            if (data.Redirect) {
              router.push('/');
            } else {
              checkRegistrationTimeout = setTimeout(checkRegistration, 3000);
            }
          })
          .catch(error => {
            console.error('Error checking registration:', error);
            checkRegistrationTimeout = setTimeout(checkRegistration, 3000);
          });
      };
  
      onMounted(() => {
        checkRegistration();
      });
  
      onBeforeUnmount(() => {
        if (checkRegistrationTimeout) {
          clearTimeout(checkRegistrationTimeout);
        }
      });
  
      return { uid, attemptCount };
    }
  };
  </script>
  
  <style>
  .container {
    background: #fff;
    padding: 20px 40px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  .uid {
    font-size: 1.5em;
    color: #0073e6;
    word-break: break-all;
  }
  
  .attempts {
    margin-top: 20px;
    font-size: 1em;
    color: #555;
  }
  </style>
  