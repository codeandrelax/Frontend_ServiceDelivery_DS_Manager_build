<template>
    <div class="container">
      <h1>Your UID</h1>
      <p class="uid">{{ uidText }}</p>
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
  
      // Execute the check on component mount
      onMounted(() => {
        checkAndRedirect();
      });
  
      return { uidText };
    }
  };
  </script>
  
  <style scoped>
  body {
    font-family: Arial, sans-serif;
    background-color: #f7f7f7;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 100vh;
    margin: 0;
  }
  .container {
    background: #fff;
    padding: 20px 40px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    text-align: center;
  }
  .uid {
    font-size: 1.5em;
    color: #0073e6;
    word-break: break-all;
  }
  </style>
  