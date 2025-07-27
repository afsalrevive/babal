declare const api: import("axios").AxiosInstance;
export type PermissionOperation = 'read' | 'write' | 'none';
export interface PermissionsResponse {
    overrides: Record<number, PermissionOperation>;
    role_permissions: Record<number, PermissionOperation>;
}
export declare function fetchUserPermissions(userId: number): Promise<PermissionsResponse>;
export default api;
