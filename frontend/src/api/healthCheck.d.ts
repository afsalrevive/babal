export declare const verifyRolesEndpoint: () => Promise<{
    valid: boolean;
    status: number;
    error: string;
} | {
    valid: boolean;
    error: string;
    status?: undefined;
} | {
    valid: boolean;
    status?: undefined;
    error?: undefined;
}>;
