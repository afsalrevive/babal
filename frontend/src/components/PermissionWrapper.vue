<template>
  <!-- Maintain existing template structure -->
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="showFallback">
    <slot name="fallback">
      <div class="permission-fallback">
        <n-icon :component="LockClosedOutline" />
        <n-text depth="3">
          {{ fallbackText }}
        </n-text>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { LockClosedOutline } from '@vicons/ionicons5'
import type { PropType } from 'vue'

const props = defineProps({
  resource: {
    type: String,
    required: true
  },
  operation: {
    type: String as PropType<'read' | 'write'>,
    validator: (v: string) => ['read', 'write'].includes(v),
    required: true
  },
  showFallback: {
    type: Boolean,
    default: true
  },
  fallbackText: {
    type: String,
    default: ''
  },
  inheritFromParent: {
    type: Boolean,
    default: false
  }
})

const auth = useAuthStore()
const normalizedResource = computed(() => props.resource.toLowerCase())

// Preserve existing logic while adding enhancements
const hasAccess = computed(() => {
  if (auth.isAdmin) return true

  // Explicitly type operation as union type
  const operation = props.operation as 'read' | 'write'
  const resource = normalizedResource.value

  // Type-safe permission checks
  const exactPermission = `${resource}.${operation}`
  const hasExact = auth.user?.perms?.includes(exactPermission) ?? false
  
  const hasImplied = operation === 'read' && 
    auth.user?.perms?.includes(`${resource}.write`)

  const hasParentAccess = props.inheritFromParent && 
    auth.hasPermission(resource, operation)

  return hasExact || hasImplied || hasParentAccess
})

// Improved fallback text handling
const computedFallbackText = computed(() => {
  if (props.fallbackText) return props.fallbackText
  return auth.isAdmin 
    ? 'Admin access required' 
    : `Requires ${normalizedResource.value}.${props.operation}`
})
</script>

<style scoped>
.permission-fallback {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  background: var(--warning-soft);
}
</style>