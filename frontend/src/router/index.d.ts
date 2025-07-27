import { RouteRecordRaw } from 'vue-router';
import { iconMap } from '@/utils/iconMap';
declare module 'vue-router' {
    interface RouteMeta {
        resource?: string;
        operation?: 'read' | 'write';
        public?: boolean;
        title?: string;
        icon?: keyof typeof iconMap;
        navOrder?: number;
    }
}
export declare const routes: RouteRecordRaw[];
declare const router: import("vue-router").Router;
export default router;
