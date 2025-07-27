import type { Component } from 'vue';
export declare function normalize(name: string): string;
export declare function hasPermission(perms: string[], resource: string, operation: 'read' | 'write'): boolean;
export declare function getIcon(resource: string): Component;
