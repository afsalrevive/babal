import { iconMap } from '@/utils/iconMap';
export function normalize(name) {
    const result = name.toLowerCase();
    return result;
}
export function hasPermission(perms, resource, operation) {
    const base = resource.toLowerCase();
    const hasWrite = perms.includes(`${base}.write`);
    const hasRead = perms.includes(`${base}.read`) || hasWrite;
    const hasNone = perms.includes(`${base}.none`);
    if (hasNone)
        return false;
    return operation === 'read' ? hasRead : hasWrite;
}
export function getIcon(resource) {
    const baseKey = normalize(resource);
    // Type-safe check
    const iconKey = Object.keys(iconMap).find(k => k.toLowerCase() === baseKey);
    return iconKey ? iconMap[iconKey] : iconMap.default;
}
//# sourceMappingURL=permissions.js.map