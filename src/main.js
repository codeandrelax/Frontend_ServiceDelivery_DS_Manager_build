// main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import VideoPlayer from 'vue-video-player';
import 'video.js/dist/video-js.css';

const app = createApp(App);

app.use(router);
app.use(VideoPlayer); // Register Video.js globally

app.mount('#app');
