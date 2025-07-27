interface JwtPayload {
    perms: string[];
    is_admin: boolean;
    session_version: number;
    sub: string;
}
interface User {
    id: number;
    name: string;
    full_name: string;
    email: string;
    perms: string[];
    is_admin: boolean;
    session_version: number;
}
export declare const useAuthStore: import("pinia").StoreDefinition<"auth", {
    token: string | null;
    user: User | null;
    storedVersion: number;
    initialized: boolean;
}, {
    isLoggedIn: (state: {
        token: string | null;
        user: {
            id: number;
            name: string;
            full_name: string;
            email: string;
            perms: string[];
            is_admin: boolean;
            session_version: number;
        };
        storedVersion: number;
        initialized: boolean;
    } & import("pinia").PiniaCustomStateProperties<{
        token: string | null;
        user: User | null;
        storedVersion: number;
        initialized: boolean;
    }>) => boolean;
    isAdmin: (state: {
        token: string | null;
        user: {
            id: number;
            name: string;
            full_name: string;
            email: string;
            perms: string[];
            is_admin: boolean;
            session_version: number;
        };
        storedVersion: number;
        initialized: boolean;
    } & import("pinia").PiniaCustomStateProperties<{
        token: string | null;
        user: User | null;
        storedVersion: number;
        initialized: boolean;
    }>) => boolean;
    hasPermission: (state: {
        token: string | null;
        user: {
            id: number;
            name: string;
            full_name: string;
            email: string;
            perms: string[];
            is_admin: boolean;
            session_version: number;
        };
        storedVersion: number;
        initialized: boolean;
    } & import("pinia").PiniaCustomStateProperties<{
        token: string | null;
        user: User | null;
        storedVersion: number;
        initialized: boolean;
    }>) => ((resource: string, operation: "read" | "write") => boolean);
}, {
    init(): Promise<void>;
    login(credentials: {
        name: string;
        password: string;
    }): Promise<void>;
    loginSuccess(data: {
        token: string;
        user: User;
    }): void;
    validateSession(decoded: JwtPayload): Promise<boolean>;
    logout(): void;
    handleUserResponse(apiUser: User, decoded: JwtPayload): void;
    decodeToken(): JwtPayload;
    persistSession(decoded: JwtPayload): void;
}>;
export {};
