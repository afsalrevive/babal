<template>
  <div class="navbar-wrapper" :class="{ collapsed }">
    <!-- Logo -->
    <div class="logo" @click="goHome">
      <transition name="fade" mode="out-in">
        <img
          v-if="!collapsed"
          src="@/assets/logo-full.png"
          class="logo-img"
          alt="Logo"
        />
        <img
          v-else
          src="@/assets/logo-icon.png"
          class="logo-icon"
          alt="Logo"
        />
      </transition>
    </div>

    <!-- Menu -->
    <n-menu
      :collapsed="collapsed"
      :collapsed-width="64"
      :collapsed-icon-size="22"
      :options="menuOptions"
      :value="activeMenu"
      @update:value="handleMenuSelect"
      accordion
      class="nav-menu"
    />

    <!-- Toggle Button (Desktop) -->
    <div class="desktop-toggle">
      <n-button
        circle
        size="small"
       @click="handleToggle">
      >
        <n-icon :component="collapsed ? ChevronForward : ChevronBack" />
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  NMenu,
  NButton,
  NIcon
} from 'naive-ui'
import {
  ChevronForward,
  ChevronBack
} from '@vicons/ionicons5'
import { getIcon } from '@/utils/permissions'

const props = defineProps<{ collapsed: boolean }>()
const emit = defineEmits(['toggle'])
const handleToggle = () => {
  emit('toggle')
}
const collapsed = ref(props.collapsed)
watch(() => props.collapsed, (val) => (collapsed.value = val))

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const activeMenu = ref(route.name?.toString() || '')
watch(() => route.name, name => {
  activeMenu.value = name?.toString() || ''
})

const toggleCollapse = () => {
  emit('toggle', !collapsed.value)
}

const handleMenuSelect = (key: string) => {
  if (key === 'EntityManager') {
    router.push({ name: 'EntityManager', params: { entity: 'customer' } }) // 👈 default entity
  } else {
    router.push({ name: key })
  }
}


const goHome = () => router.push('/dashboard')

const menuOptions = computed(() => {
  return router.getRoutes()
    .filter(route => {
      const meta: any = route.meta
      return !meta.public && 
        meta.showInNav !== false && 
        meta.resource &&
        auth.hasPermission(meta.resource, meta.operation || 'read')
    })
    .sort((a, b) => (a.meta?.navOrder || 100) - (b.meta?.navOrder || 100))
    .map(route => {
      const meta: any = route.meta
      return {
        label: meta.title || route.name?.toString() || '',
        key: route.name?.toString() || '',
        icon: () =>
          h(NIcon, null, {
            default: () => h(getIcon(meta.resource))
          })
      }
    })
})
</script>

<style scoped>
.navbar-wrapper {
  width: 220px;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.navbar-wrapper.collapsed {
  width: 64px;
}
.logo {
  padding: 1rem;
  text-align: center;
}
.logo-img {
  height: 32px;
}
.logo-icon {
  height: 32px;
  width: 32px;
}
.nav-menu {
  flex: 1;
}
.desktop-toggle {
  padding: 1rem;
  text-align: center;
}
.toggle-btn {
  transition: transform 0.3s ease;
}
.toggle-btn:hover {
  transform: rotate(180deg);
}
</style>