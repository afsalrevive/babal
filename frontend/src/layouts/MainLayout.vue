<template>
  <n-layout has-sider>
    <!-- Sidebar -->
    <n-layout-sider
      v-if="auth.isLoggedIn"
      :collapsed="collapsed"
      collapse-mode="width"
      :width="220"
      :collapsed-width="64"
      bordered
      show-trigger="bar"
      :native-scrollbar="false"
      @update:collapsed="collapsed = $event"
      :style="{ backgroundColor: isDark ? 'var(--card-bg)' : 'var(--header-bg)' }"
    >
      <Navbar :collapsed="collapsed" @toggle="toggleCollapse" />
    </n-layout-sider>

    <!-- Main content -->
    <n-layout>
      <!-- Header with user profile -->
      <n-layout-header v-if="auth.isLoggedIn" bordered class="header">
        <div class="header-content">
          <div class="left">
            <!-- Mobile hamburger button -->
            <n-button
              v-if="showHamburger"
              quaternary
              size="large"
              circle
              @click="toggleCollapse"
            >
              <n-icon :component="MenuOutline" />
            </n-button>
            
            <!-- Theme toggle button -->
            <n-button
              quaternary
              circle
              size="large"
              @click="$emit('toggle-theme')"
              class="theme-toggle-btn"
            >
              <n-icon v-if="isDark" :component="SunnyOutline" />
              <n-icon v-else :component="MoonOutline" />
            </n-button>
          </div>
          <div class="right">
            <!-- User profile dropdown -->
            <n-dropdown trigger="click" :options="profileOptions" @select="handleProfileAction">
              <div class="profile-info clickable">
                <n-avatar :size="40" :text="initials" round />
                <div class="username">{{ userName }} ▼</div>
              </div>
            </n-dropdown>
          </div>
        </div>
      </n-layout-header>

      <!-- Routed content -->
      <n-layout-content class="content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NLayoutHeader,
  NButton,
  NIcon,
  NAvatar,
  NDropdown
} from 'naive-ui'
import { MenuOutline, SunnyOutline, MoonOutline } from '@vicons/ionicons5' // Add theme icons
import Navbar from '@/components/Navbar.vue'

const auth = useAuthStore()
const router = useRouter()
const collapsed = ref(false)
const showHamburger = ref(false)

// Add props and emits
defineProps({
  isDark: Boolean
})
defineEmits(['toggle-theme'])

const initials = computed(() => {
  return auth.user?.full_name?.split(' ').map(s => s[0]).join('') || ''
})

const userName = computed(() =>
  auth.user?.full_name ? auth.user.full_name.charAt(0).toUpperCase() + auth.user.full_name.slice(1) : ''
)

const profileOptions = [
  { label: 'Profile', key: 'profile' },
  { label: 'Logout', key: 'logout' }
]

const handleProfileAction = (key: string) => {
  if (key === 'logout') {
    auth.logout()
    router.push('/login')
  } else if (key === 'profile') {
    router.push('/profile')
  }
}

const handleResize = () => {
  const isMobile = window.innerWidth < 768
  showHamburger.value = isMobile
  if (isMobile) collapsed.value = true
  else collapsed.value = false
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<style scoped>
.content {
  padding: 24px;
  background: var(--body-bg);
  min-height: 100vh;
  transition: background-color 0.3s;
}

.header {
  height: 64px;
  padding: 0 24px;
  background-color: var(--header-bg);
  transition: background-color 0.3s;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.profile-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-left: 12px;
  color: var(--text-color);
}

/* Theme toggle button */
.theme-toggle-btn {
  margin-left: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>