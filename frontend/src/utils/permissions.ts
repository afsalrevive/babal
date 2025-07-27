import { iconMap, type IconName } from '@/utils/iconMap'
import type { Component } from 'vue' 
import { useAuthStore } from '@/stores/auth'

export function normalize(name: string): string {
  const result = name.toLowerCase()
  return result
}

export function hasPermission(
  perms: string[],
  resource: string,
  operation: 'read' | 'write'
): boolean {
  const base = resource.toLowerCase()
  const hasWrite = perms.includes(`${base}.write`)
  const hasRead = perms.includes(`${base}.read`) || hasWrite
  const hasNone = perms.includes(`${base}.none`)

  if (hasNone) return false
  return operation === 'read' ? hasRead : hasWrite
}
export function getIcon(resource: string): Component {
  const baseKey = normalize(resource)
  
  // Type-safe check
const iconKey = Object.keys(iconMap).find(k => 
    k.toLowerCase() === baseKey
  ) as IconName | undefined

  return iconKey ? iconMap[iconKey] : iconMap.default
}
