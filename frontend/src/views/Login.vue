<template>
  <n-layout>
    <!-- Dark Mode Toggle Button -->
    <div class="top-bar">
      <n-button
        quaternary
        circle
        size="large"
        @click="$emit('toggle-theme')"
        class="theme-toggle-btn"
      >
        <n-icon :component="isDark ? SunnyOutline : MoonOutline" />
      </n-button>
    </div>

    <!-- Login Card -->
    <n-layout-content
      style="display: flex; justify-content: center; align-items: center; min-height: 80vh;"
    >
      <n-card title="Login" class="login-card">
        <n-form>
          <n-form-item label="Username" path="name">
            <n-input v-model:value="form.name" placeholder="Username" />
          </n-form-item>
          <n-form-item label="Password" path="password">
            <n-input
              v-model:value="form.password"
              type="password"
              placeholder="Password"
            />
          </n-form-item>
          <n-button type="primary" block @click="submit">Login</n-button>

          <div style="text-align: center; margin-top: 16px;">
            <n-button text @click="router.push('/signup')">
              Don't have an account? Sign Up
            </n-button>
          </div>
        </n-form>
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage, NLayout, NLayoutContent, NCard, NForm, NFormItem, NInput, NButton } from 'naive-ui'
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5'

defineProps<{
  isDark: boolean
}>()

defineEmits(['toggle-theme'])


// router + auth store + message
const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

// reactive form model
const form = reactive({
  name: '',
  password: ''
})

async function submit() {
  if (!form.name || !form.password) {
    message.warning('Please enter both username and password')
    return
  }
  try {
    // Pass as single object argument
    await auth.login({
      name: form.name,  // Match the expected parameter name
      password: form.password
    })
    router.push('/dashboard')
  } catch (err: any) {
    const msg = err?.response?.data?.error || err.message || 'Login failed'
    message.error(msg)
  }
}
</script>

<style scoped>

.top-bar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}
</style>
