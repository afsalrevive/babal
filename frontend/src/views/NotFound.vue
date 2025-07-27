<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const goHome = () => router.push('/')
</script>

<template>
  <n-layout style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
    <n-result
      status="404"
      title="Page Not Found"
      description="The page you are looking for doesn't exist or was moved."
    >
      <template #footer>
        <n-button type="primary" @click="goHome">Back to Home</n-button>
      </template>
    </n-result>
  </n-layout>
</template>