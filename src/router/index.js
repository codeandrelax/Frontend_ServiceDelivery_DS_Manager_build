import { createRouter, createWebHistory } from 'vue-router';
import ShowUUID from '../views/ShowUUID.vue';
import RegisterDevice from '../views/RegisterDevice.vue';
import Origin from '../views/Origin.vue';

const routes = [
  { path: '/', name: 'Origin', component: Origin },  // Origin is now the default route
//   { path: '/origin', name: 'Origin', component: Origin },  // Origin is now the default route
  { path: '/register_device', name: 'RegisterDevice', component: RegisterDevice },
  { path: '/show_uuid', name: 'ShowUUID', component: ShowUUID } // Updated path
];

const router = createRouter({
  history: createWebHistory("/serve_ad/"),
  routes
});

export default router;
