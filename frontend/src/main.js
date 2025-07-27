// src/main.ts
import { useAuthStore } from '@/stores/auth';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import '@/styles/global.scss';
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
// initialize auth store (set Axios header if token exists)
const auth = useAuthStore();
auth.init().catch((error) => {
    console.error('Auth initialization failed:', error);
}).finally(() => {
    app.mount('#app');
});
// Add global error handler
app.config.errorHandler = (err, vm, info) => {
    console.error('Global error:', err);
    router.push('/not-found');
};
// set baseURL for axios
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
//# sourceMappingURL=main.js.map