import { createRouter, createWebHistory } from 'vue-router';
import ShowUUID from '../views/ShowUUID.vue';
import RegisterDevice from '../views/RegisterDevice.vue';
import Origin from '../views/Origin.vue';
import FullCalendar from '../views/FullCalendar.vue'; // ✅ Import Playlist

const routes = [
  { path: '/', name: 'Origin', component: Origin },
  { path: '/register_device', name: 'RegisterDevice', component: RegisterDevice },
  { path: '/show_uuid', name: 'ShowUUID', component: ShowUUID },
  { path: '/video_playlist', name: 'FullCalendar', component: FullCalendar } // ✅ Add Playlist Route
];

const router = createRouter({
  history: createWebHistory('/serve_ad/'),
  routes
});

export default router;
