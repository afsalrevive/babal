// src/api.ts
import axios from 'axios';
import router from '@/router';
import { useAuthStore } from '@/stores/auth';
const api = axios.create({
    baseURL: '',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});
// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(config => {
    const auth = useAuthStore();
    const currentRoute = router.currentRoute.value;
    // Attach JWT token
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Skip header injection for public routes
    if (currentRoute.meta.public) {
        return config;
    }
    const resourceRoute = currentRoute.matched.find(r => r.meta?.resource && r.meta.showInNav !== false);
    if (resourceRoute?.meta.resource) {
        const resource = resourceRoute.meta.resource;
        config.headers['X-Resource'] = resource;
        // Infer operation based on HTTP method
        const method = config.method?.toLowerCase();
        const writeMethods = ['post', 'put', 'patch', 'delete'];
        const operation = writeMethods.includes(method ?? '') ? 'write' : 'read';
        config.headers['X-Operation'] = operation;
    }
    else {
        console.debug('No nav-visible resource for:', currentRoute.path);
    }
    return config;
});
// ==================== RESPONSE INTERCEPTOR ====================
let isRefreshing = false;
api.interceptors.response.use(response => response, async (error) => {
    const auth = useAuthStore();
    // 1. Handle 401 Unauthorized
    if (error.response?.status === 401 && !isRefreshing) {
        isRefreshing = true;
        // Clear invalid credentials
        auth.logout();
        localStorage.removeItem('token');
        // Redirect to login only if not already there
        if (!router.currentRoute.value.meta.public) {
            router.push({
                name: 'Login',
                query: {
                    redirect: router.currentRoute.value.fullPath
                }
            });
        }
        // Reset refresh lock after 2s
        setTimeout(() => isRefreshing = false, 2000);
    }
    // 2. Handle 403 Forbidden
    if (error.response?.status === 403) {
        const resource = error.config.headers['X-Resource'];
        const operation = error.config.headers['X-Operation'];
        console.error(`Missing ${resource}.${operation} permission`);
        // Show user-facing error
        const message = useMessage();
        message.error(`You need ${operation} access for ${resource}`);
    }
    return Promise.reject(error);
});
// 2️⃣ A typed helper for that endpoint
export function fetchUserPermissions(userId) {
    // axios.get<T>() ensures `res.data` is `PermissionsResponse`
    return api.get(`/api/users/${userId}/permissions`)
        .then(res => res.data);
}
export default api;
//# sourceMappingURL=api.js.map