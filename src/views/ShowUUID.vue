<template>
  <div class="background">
    <div class="container">
      <h1>Your UID</h1>
      <p class="uid">{{ uidText }}</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'ShowUUID',
  setup() {
    const uidText = ref('Checking UID...');
    const router = useRouter();

    /**
     * Retrieves a cookie value by name.
     * @param {string} name - The name of the cookie.
     * @returns {string|null} The cookie value, or null if not found.
     */
    const getCookie = (name) => {
      const nameEQ = name + "=";
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
      }
      return null;
    };

    /**
     * Checks for the UID cookie and either displays it or redirects.
     */
    const checkAndRedirect = () => {
      setTimeout(() => {
        console.log("Document cookies:", document.cookie);
        let uid = getCookie("uid");
        if (uid) {
          uidText.value = uid;
        } else {
          // Redirect to register_device route if no UID is found
          router.push('/serve_ad/register_device');
        }
      }, 500);
    };

    onMounted(() => {
      checkAndRedirect();
    });

    return { uidText };
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
  background: rgba(188, 172, 212, 0.752); /* Light Purple Background */
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #0d47a1;
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
