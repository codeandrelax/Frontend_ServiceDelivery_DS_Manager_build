<template>
  <div class="background">
    <div class="container">
      <h1>Your UID Cookie</h1>
      <p class="uid">{{ uid }}</p>
      <p class="status" v-if="!isOnline">🔴 No Internet Connection. Retrying...</p>
    </div>
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
    const isOnline = ref(navigator.onLine);
    let checkRegistrationTimeout = null;
    let offlineReloadInterval = null;

    const getCookie = (name) => {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
      }
      return null;
    };

    const setCookie = (name, value) => {
      let domain = "";
      if (window.location.hostname.endsWith("indigoingenium.ba")) {
        domain = "; domain=.indigoingenium.ba";
      }
      // Set expiration date far in the future (e.g., 100 years)
      const expires = "; expires=Fri, 31 Dec 2123 23:59:59 GMT";
      document.cookie = name + "=" + (value || "") + expires + "; path=/" + domain;
  };

    const generateUid = () => {
      const array = new Uint8Array(6);
      window.crypto.getRandomValues(array);
      const hexArray = Array.from(array, byte =>
        byte.toString(16).padStart(2, '0')
      );
      return hexArray.join(':').toLowerCase();
    };

    let cookieUid = getCookie("uid");
    if (!cookieUid) {
      cookieUid = generateUid();
      setCookie("uid", cookieUid, 365);
    }
    uid.value = cookieUid.toLowerCase();

    const checkRegistration = () => {
      if (!isOnline.value) {
        console.warn("Offline mode. Page will refresh every 5 seconds...");
        return;
      }

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
          if (isOnline.value) {
            checkRegistrationTimeout = setTimeout(checkRegistration, 3000);
          }
        });
    };

    const handleOnline = () => {
      isOnline.value = true;
      console.log("✅ Internet connection restored");
      clearInterval(offlineReloadInterval); // Stop refreshing when back online
      checkRegistration();
    };

    const handleOffline = () => {
      isOnline.value = false;
      console.warn("❌ Lost internet connection");
      if (checkRegistrationTimeout) {
        clearTimeout(checkRegistrationTimeout);
      }
      // Refresh page every 5 seconds when offline
      offlineReloadInterval = setInterval(() => {
        console.log("🔄 No connection. Reloading page...");
        window.location.reload();
      }, 10000);
    };

    onMounted(() => {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      checkRegistration();

      // If page starts offline, trigger the reload interval
      if (!navigator.onLine) {
        handleOffline();
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkRegistrationTimeout) {
        clearTimeout(checkRegistrationTimeout);
      }
      if (offlineReloadInterval) {
        clearInterval(offlineReloadInterval);
      }
    });

    return { uid, isOnline };
  }
};
</script>

<style scoped>
/* Full-screen Background with Background Image */
.background {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: url('/background1.png') no-repeat center center fixed;
  background-size: cover;
  margin: 0;
}

/* Main Container with Transparency */
.container {
  background: rgb(210, 218, 230); /* Light transparent background */
  padding: 40px 60px;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 400px;
  width: 100%;
  animation: fadeIn 1s ease-in-out;
}

/* Header Style */
h1 {
  font-size: 1.8em;
  margin-bottom: 20px;
  color: #091170; /* Dark Indigo */
  letter-spacing: 1px;
}

/* UID Display */
.uid {
  font-size: 2.0em;
  color: #000000; /* Deep Blue */
  word-break: break-word;
  background: rgba(188, 172, 212, 0.752); /* Light Blue Background */
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #0d47a1;
}

/* Internet Status */
.status {
  margin-top: 15px;
  font-size: 1em;
  color: #d32f2f; /* Red for offline */
  font-weight: bold;
}

/* Smooth Fade In Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 600px) {
  .container {
    padding: 30px 20px;
  }

  h1 {
    font-size: 1.5em;
  }

  .uid {
    font-size: 1.2em;
  }
}
</style>
