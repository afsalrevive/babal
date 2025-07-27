export const verifyRolesEndpoint = async () => {
    try {
        const response = await fetch('/api/roles');
        if (!response.ok) {
            return {
                valid: false,
                status: response.status,
                error: `HTTP Error ${response.status}`
            };
        }
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            return {
                valid: false,
                error: 'Invalid content type'
            };
        }
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            error: 'Network request failed'
        };
    }
};
//# sourceMappingURL=healthCheck.js.map