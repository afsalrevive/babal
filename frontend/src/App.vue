<template>
  <n-config-provider :theme="currentTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <component
        :is="isAuthPage ? currentPageComponent : MainLayout"
        :is-dark="isDark"
        @toggle-theme="toggleTheme"
      />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NConfigProvider, darkTheme } from 'naive-ui';
import MainLayout from '@/layouts/MainLayout.vue';
import { useRoute } from 'vue-router'
import Login from '@/views/Login.vue'
import Signup from '@/views/Signup.vue'

// Theme state
const isDark = ref(false);
const currentTheme = computed(() => isDark.value ? darkTheme : null);

// Theme toggle handler
const toggleTheme = () => {
  isDark.value = !isDark.value;
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
};

// Initialize theme from localStorage or system preference
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  isDark.value = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
};

initTheme();

const route = useRoute()
const isAuthPage = computed(() => ['/login', '/signup'].includes(route.path))
const currentPageComponent = computed(() => route.path === '/signup' ? Signup : Login)

// Theme overrides
const themeOverrides = computed(() => ({
  common: {
    primaryColor: isDark.value ? '#64b5f6' : '#1e88e5',
    primaryColorHover: isDark.value ? '#42a5f5' : '#1565c0',
    primaryColorPressed: isDark.value ? '#1e88e5' : '#0d47a1',
    borderRadius: '8px',
  },
  Card: {
    borderRadius: '8px',
    paddingMedium: '24px',
    color: isDark.value ? '#1e1e1e' : '#ffffff',
    colorEmbedded: isDark.value ? '#1e1e1e' : '#ffffff',
  },
  DataTable: {
    thPaddingMedium: '16px 12px',
    tdPaddingMedium: '14px 12px',
    thColor: isDark.value ? '#2d2d2d' : '#f8fafc',
    tdColor: isDark.value ? '#1e1e1e' : '#ffffff',
    thTextColor: isDark.value ? '#e0e0e0' : '#333',
  },
  Button: {
    paddingMedium: '0 16px',
    heightMedium: '36px',
  }
}));
</script>