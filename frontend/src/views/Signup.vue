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

    <n-layout-content class="signup-wrapper">
      <div class="form-container">
        <n-card class="signup-card" title="Create Your Account" bordered>
          <n-form :model="form" :rules="rules" ref="formRef">
            <div class="form-grid">
              <n-form-item label="Full Name" path="full_name">
                <n-input 
                  v-model:value="form.full_name" 
                  placeholder="Your name" 
                  clearable
                />
              </n-form-item>

              <n-form-item label="Username" path="name">
                <n-input 
                  v-model:value="form.name" 
                  placeholder="Preferred username" 
                  clearable
                />
              </n-form-item>

              <n-form-item label="User Type">
                <n-radio-group v-model:value="form.role_type">
                  <n-radio value="staff">Employee</n-radio>
                  <n-radio value="others">Others</n-radio>
                </n-radio-group>
              </n-form-item>

              <n-form-item v-if="form.role_type === 'staff'" label="Employee ID" path="emp_id">
                <n-input-number
                  v-model:value="form.emp_id"
                  placeholder="Enter employee ID"
                  :integer="true"
                  :min="1"
                  clearable
                  :input-props="{ inputmode: 'numeric', pattern: '[0-9]*' }"
                />
              </n-form-item>

              <n-form-item label="Email" path="email">
                <n-input
                  v-model:value="form.email"
                  placeholder="Your email address"
                  type="text"
                  clearable
                />
              </n-form-item>

              <n-form-item label="Password" path="password">
                <n-input
                  type="password"
                  v-model:value="form.password"
                  placeholder="Choose a password"
                  clearable
                />
              </n-form-item>

              <n-form-item label="Confirm Password" path="confirmPassword">
                <n-input
                  type="password"
                  v-model:value="form.confirmPassword"
                  placeholder="Re-enter password"
                  clearable
                />
              </n-form-item>
            </div>

            <n-form-item>
              <n-button type="primary" block @click="handleSignup">
                Sign Up
              </n-button>
            </n-form-item>

            <div style="text-align: center; margin-top: 16px;">
              <n-button text @click="router.push('/login')">
                Login to existing account
              </n-button>
            </div>
          </n-form>
        </n-card>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NLayout,
  NLayoutContent,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  useMessage,
  type FormRules
} from 'naive-ui'
import api from '../api'
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5'

defineProps<{
  isDark: boolean
}>()

defineEmits(['toggle-theme'])

const message = useMessage()
const router = useRouter()

interface SignupForm {
  name: string
  full_name: string
  email: string
  password: string
  confirmPassword: string
  emp_id: string | null
  role_type: 'staff' | 'others'
}


const form = ref<SignupForm>({
  name: '',
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
  emp_id: null,
  role_type: 'staff' // default selection
})


const rules: FormRules = {
  name: [{ required: true, message: 'Username is required' }],
  full_name: [{ required: true, message: 'Full Name is required' }],
  email: [
    {
      validator: (_, value: string) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return new Error('Please enter a valid email address')
        }
        return true
      },
      trigger: ['input', 'blur']
    }
  ],
  password: [{ required: true, message: 'Password is required' }],
  confirmPassword: [
    { required: true, message: 'Confirm password is required' },
    {
      validator: (_, value) => value === form.value.password,
      message: 'Passwords do not match',
      trigger: ['input', 'blur']
    }
  ],
  emp_id: [
    {
      validator: (_rule, value) => {
        // allow `null` or `undefined` (i.e. no entry)
        if (value === null || value === undefined) {
          return true
        }
        // otherwise enforce integer
        return Number.isInteger(value)
      },
      message: 'Employee ID must be a number',
      trigger: ['input', 'blur']
    }
  ]
}


const autoGeneratedName = ref(true)

watch(() => form.value.full_name, (newVal) => {
  if (!newVal?.trim()) {
    if (autoGeneratedName.value) form.value.name = ''
    return
  }

  const suggested = newVal.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (autoGeneratedName.value || !form.value.name) {
    form.value.name = suggested
    autoGeneratedName.value = true
  }
})

watch(() => form.value.name, (newVal) => {
  const expected = form.value.full_name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || ''
  if (newVal !== expected) {
    autoGeneratedName.value = false
  }
})

const formRef = ref()
const handleSignup = async () => {
  try {
    await formRef.value?.validate()
    const payload = {
      ...form.value,
      emp_id: form.value.emp_id ? Number(form.value.emp_id) : null,
      role_id: 3  // Default role for signups
    }
    delete payload.confirmPassword

    const res = await api.post('/api/signup', payload)
    message.success(`Account for ${form.value.name} created successfully!`)
    setTimeout(() => {
      window.location.href = '/login'
    }, 1000)
  } catch (err: any) {
    if (err.response) {
      message.error(err.response.data.error || 'Signup failed')
    } else {
      message.error('Please fill all required fields correctly')
    }
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;
.signup-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 24px;
  background: var(--body-bg); // use theme variable
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.signup-card {
  width: 100%;
  max-width: 480px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  background-color: var(--card-bg); // respect theme
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}

.form-container {
  width: 100%;
  padding: 0 16px;
  display: flex;
  justify-content: center;
}
.top-bar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
}


</style>