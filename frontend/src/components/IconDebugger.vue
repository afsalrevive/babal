<!-- components/IconDebugger.vue -->
<template>
  <n-card title="Icon Mappings" class="debug-panel">
    <div v-for="(icon, name) in iconMap" :key="name">
      <n-icon :component="icon" />
      <span>{{ name }}</span>
    </div>
  </n-card>
</template>

<script setup>
import { iconMap } from '@/utils/iconMap'
</script>