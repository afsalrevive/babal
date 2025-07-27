import { useAuthStore } from '@/stores/auth'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import axios from 'axios'

import '@/styles/global.scss'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// set baseURL for axios
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'https://app.babaltheqa.com/api';

// initialize auth store (set Axios header if token exists)
const auth = useAuthStore()
auth.init().catch((error) => {
  console.error('Auth initialization failed:', error)
})

// always mount the app
app.mount('#app')

// global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err)
  router.push('/not-found')
}
