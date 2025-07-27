<template>
    <n-alert title="Effective Permissions" type="info" v-if="showDebug">
      <div v-for="p in perms" :key="p">{{ p }}</div>
    </n-alert>
  </template>
  
  <script setup>
  import { useAuthStore } from '@/stores/auth'
  const auth = useAuthStore()
  const showDebug = import.meta.env.DEV
  const perms = computed(() => auth.perms)
  </script>