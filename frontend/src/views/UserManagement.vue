<template>
  <n-card>
    <template #header>
      <n-h2>User Management</n-h2>
    </template>
    <template #header-extra>
      <n-text depth="3" v-if="canWrite">
        (You have write access)
      </n-text>
      <n-text depth="3" v-else>
        (Read-only mode)
      </n-text>
    </template>

    <!-- Toolbar -->
    <div class="toolbar">
      <n-input
        v-model:value="searchQuery"
        placeholder="Search users..."
        clearable
        class="search-input"
      />
      <div class="button-group">
        <n-button v-if="canWrite" type="primary" class="action-button" @click="openAddUserModal">
          Add User
        </n-button>
        <n-button class="toggle-extras action-button" size="small" @click="showExtras = !showExtras">
          <n-icon :component="showExtras ? iconMap.collapse : iconMap.expand" />
          {{ showExtras ? 'Hide Details' : 'Show Details' }}
        </n-button>
      </div>

      <!-- Bulk Action Buttons -->
      <div v-if="selectedRowKeys.length && canWrite" class="bulk-action-buttons">
        <n-button type="primary" class="action-button" @click="showBulkModal = true">
          Bulk Edit ({{ selectedRowKeys.length }})
        </n-button>
        <n-button type="error" class="action-button" @click="showDeleteConfirm = true">
          Delete Selected
        </n-button>
      </div>
    </div>

    <!-- User Tables -->
    <n-tabs v-model:value="activeTab" type="card">
      <n-tab-pane name="active" tab="Active Users">
        <n-data-table
          table-layout="auto"
          :class="['user-table', { 'show-extras': showExtras }]"
          :columns="responsiveColumns"
          :data="filteredActiveUsers"
          :loading="loadingUsers"
          :row-key="r => r.id"  
          v-model:checked-row-keys="selectedRowKeys"
        />
      </n-tab-pane>
      <n-tab-pane name="inactive" tab="Inactive Users">
        <n-data-table
          table-layout="auto"
          :class="['user-table', { 'show-extras': showExtras }]"
          :columns="responsiveColumns"
          :data="filteredInactiveUsers"
          :loading="loadingUsers"
          :row-key="r => r.id"
          v-model:checked-row-keys="selectedRowKeys"
        />
      </n-tab-pane>
    </n-tabs>

    <!-- Bulk Edit Modal -->
    <n-modal v-model:show="showBulkModal" preset="card" style="width: 600px">
      <template #header>
        <n-h3>Bulk Edit Users</n-h3>
        <n-text depth="3">{{ selectedRowKeys.length }} users selected</n-text>
      </template>

      <div class="bulk-modal-content">
        <div class="selected-users-section">
          <n-text strong>Affected Users:</n-text>
          <n-scrollbar style="max-height: 100px" class="user-list">
            {{ selectedUserNames }}
          </n-scrollbar>
        </div>

        <n-form class="bulk-form">
          <!-- Add @update:value handlers to track changes -->
          <n-form-item label="Status">
            <n-select
              v-model:value="bulkForm.status"
              :options="statusOptions"
              placeholder="Select status"
              clearable
              @update:value="() => markFieldDirty('status')"
            />
          </n-form-item>

          <n-form-item label="Role">
            <n-select
              v-model:value="bulkForm.role_id"
              :options="roleOptions"
              placeholder="Select role"
              clearable
              @update:value="() => markFieldDirty('role_id')"
            />
          </n-form-item>
        </n-form>

        <div class="form-actions">
          <n-button type="primary" @click="confirmBulkUpdate">Update</n-button>
          <n-button secondary @click="resetBulkForm">Reset</n-button>
          <n-button @click="cancelBulkEdit">Cancel</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Bulk Update Confirmation Modal -->
    <n-modal v-model:show="showBulkConfirm">
      <n-card title="Confirm Bulk Changes" style="max-width: 500px;">
        <n-text>You are about to apply these changes:</n-text>
        <n-ul class="changes-list">
          <n-li v-for="(change, index) in changesList" :key="index">
            <span class="change-item">
              {{ change.label }}
              <n-text v-if="change.clear" type="error" class="clear-indicator">
                ×
              </n-text>
              <n-text v-else depth="3">{{ change.value }}</n-text>
            </span>
          </n-li>
        </n-ul>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showBulkConfirm = false">Cancel</n-button>
            <n-button type="primary" @click="performBulkUpdate">Confirm</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Delete Confirmation -->
    <n-modal v-model:show="showDeleteConfirm">
      <n-card title="Confirm User Deletion" style="max-width: 500px;">
        <n-text strong>This action cannot be undone!</n-text>
        <n-text depth="3" block class="confirmation-user-list">
          {{ selectedUserNames }}
        </n-text>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showDeleteConfirm = false">Cancel</n-button>
            <n-button type="error" @click="performBulkDelete">Delete Permanently</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <!-- Add/Edit User Modal -->
    <n-modal v-model:show="showUserModal">
      <n-card :title="bulkAddMode ? 'Add Multiple Users' : (editingUser ? 'Edit User' : 'Add User')">
        <n-form ref="userFormRef" class="user-form-grid">
          <!-- Bulk Mode Toggle -->
          <n-form-item v-if="!editingUser" label="Bulk Add Mode">
            <n-switch v-model:value="bulkAddMode" @update:value="handleBulkModeChange" />
          </n-form-item>

          <!-- Common Fields (Preserved in bulk mode) -->
          <n-form-item label="Role" path="role_id" required>
            <n-select v-model:value="userForm.role_id" :options="roleOptions" />
          </n-form-item>

          <n-form-item label="Status" path="status" required>
            <n-select v-model:value="userForm.status" :options="statusOptions" />
          </n-form-item>


          <!-- Individual Fields (Cleared in bulk mode) -->
          <n-form-item label="Full Name" path="full_name" required>
            <n-input v-model:value="userForm.full_name" />
          </n-form-item>

          <n-form-item label="Username" path="name" required>
            <n-input v-model:value="userForm.name" />
          </n-form-item>

          <n-form-item label="Email" path="email">
            <n-input v-model:value="userForm.email" />
          </n-form-item>

          <n-form-item label="Employee ID" path="emp_id">
            <n-input-number v-model:value="userForm.emp_id" :min="1" />
          </n-form-item>

          <n-form-item label="Password" path="password" :required="!editingUser">
            <n-input type="password" v-model:value="userForm.password" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space vertical>
            <!-- Pending Users List -->
            <div v-if="bulkAddMode && pendingUsers.length > 0">
              <n-text strong>Pending Users:</n-text>
              <div class="cards-container">
                <n-card
                  size="small"
                  v-for="(user, i) in pendingUsers"
                  :key="i"
                  class="pending-card"
                >
                  <n-space vertical size="small">
                    <n-text strong>{{ user.name || 'Unnamed' }}</n-text>
                    <n-text strong>{{ user.full_name || 'Unnamed' }}</n-text>
                    <n-text v-if="user.email">✉ {{ user.email }}</n-text>
                    <n-text v-if="user.emp_id">🆔 {{ user.emp_id }}</n-text>
                  </n-space>
                  <template #footer>
                    <n-space>
                      <n-button size="tiny" @click="editPendingUser(i)">Edit</n-button>
                      <n-button size="tiny" type="error" @click="removePendingUser(i)">Remove</n-button>
                    </n-space>
                  </template>
                </n-card>
              </div>
            </div>

            <!-- Action Buttons -->
            <n-space justify="end">
              <n-button @click="closeUserModal">Cancel</n-button>
              <n-button
                v-if="bulkAddMode"
                type="primary"
                @click="saveAndNext"
                :disabled="!canSaveNext"
                :loading="checkingDuplicates"
              >
                {{ editIndex === null ? 'Save & Next' : 'Update & Next' }}
              </n-button>
              <n-button
                type="primary"
                @click="bulkAddMode ? finishBulkAdd() : submitUser()"
                :disabled="!canSubmit"
              >
                {{ bulkAddMode ? 'Finish & Save All' : 'Save' }}
              </n-button>
            </n-space>
          </n-space>
        </template>
    </n-card>
  </n-modal>

    <!-- Edit User Permissions Modal -->
    <n-modal
      v-model:show="showUserPermModal"
      :mask-closable="false"
      class="perm-modal"
    >
      <n-card class="modal-card">
            <template #header>
              <n-text strong>
                Edit Permissions — {{ editingUser?.name || '' }}
              </n-text>
            </template>
        <n-form :model="permForm" ref="permFormRef">
          <n-form-item
            v-for="page in aclPages"
            :key="page.id"
            :label="page.name"
            class="perm-row"
          >
            <n-icon :component="page.iconComponent" size="20" />
            <n-select
              v-model:value="permForm[page.id]"
              :options="getPermissionOptions(page.id)"
              placeholder="Permission"
            />
            <span class="perm-spacer" />
            <n-text depth="3" class="perm-hint">{{ getPermissionHint(page.id, permForm[page.id]) }}</n-text>
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="space-between" align="center" class="perm-footer-space">
            <n-button @click="closeUserPermissionsModal">Cancel</n-button>
            <PermissionWrapper resource="usermanagement" operation="write">
              <n-button type="primary" :loading="savingPerms" @click="submitUserPermissions">
                Save
              </n-button>
            </PermissionWrapper>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h,watch } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import { hasPermission } from '@/utils/permissions'
import PermissionWrapper from '@/components/PermissionWrapper.vue'
import { iconMap, type IconName } from '@/utils/iconMap'
import {
  NInput,
  NInputNumber,
  NButton,
  NDataTable,
  NTabs,
  NTabPane,
  NModal,
  NForm,
  NFormItem,
  NSelect,
  NText,
  NIcon,
} from 'naive-ui'
import type { DataTableColumns, FormInst } from 'naive-ui'

type PermissionOp = 'none' | 'read' | 'write' | 'inherit'
type PermBase = 'none' | 'read' | 'write'

interface AclPage {
  id: number
  name: string
  iconComponent: any
}

interface User {
  id: number
  name: string
  full_name: string
  email: string
  emp_id: number | null
  status: string
  role: { id: number; name: string }
  last_seen: string | null
}
interface BulkForm {
  status: string | null;
  role_id: number | null;
}

const editIndex = ref<number | null>(null)
const authStore = useAuthStore()
const message = useMessage()
const bulkAddMode = ref(false);
const bulkUsers = ref<Array<{
  name: string;
  full_name: string;
  email: string;
  emp_id: number | null;
  password: string;
}>>([]);

const showExtras = ref(false)

const responsiveColumns = computed(() => {
  return userColumns.value.filter(col => {
    if ((col as any).type === 'selection') return true
    const key = (col as any).key as string
    // always keep these
    if (['name','emp_id','department','permissions','actions'].includes(key)) {
      return true
    }
    // the rest show only when toggled on
    return showExtras.value
  }) as DataTableColumns<User>
})


// State
const users = ref<User[]>([])
const loadingUsers = ref(false)
const selectedRowKeys = ref<number[]>([])
const activeTab = ref<'active' | 'inactive'>('active')
const searchQuery = ref('')

const showBulkModal = ref(false)
const bulkGroups = ref<Array<{ label: string; value: number }>>([])

const showUserModal = ref(false)
const editingUser = ref<User | null>(null)
const userForm = reactive({
  name: '',
  full_name: '',
  email: '',
  emp_id: null as number | null,
  password: '',
  role_id: null as number | null,
  status: 'active'
})
const userFormRef = ref<FormInst | null>(null)

const showUserPermModal = ref(false)
const savingPerms = ref(false)
const aclPages = ref<AclPage[]>([])
const permForm = reactive<Record<number, PermissionOp>>({})
const permFormRef = ref<FormInst | null>(null)
const userEffectivePerms = reactive<Record<number, Record<number, PermBase>>>({})
const rolePermMap = reactive<Record<number, PermBase>>({})
const initialUserOverrides = ref<Set<number>>(new Set())

const checkingDuplicates = ref(false)

interface PendingUser {
  name: string
  full_name: string 
  email: string           // always a string ("" if absent)
  emp_id: number | null
  password: string
  status: 'pending' | 'duplicate'
  role_id: number | null
}

const pendingUsers = ref<PendingUser[]>([])

const isEmailValid = computed(() => {
  return !userForm.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)
})
  // Add new state variables
const showBulkConfirm = ref(false)
const showDeleteConfirm = ref(false)
const dirtyFields = reactive({
  status: false,
  role_id: false,
  department_id: false,
  group_id: false
})
// Modify bulkForm structure
const bulkForm = reactive<BulkForm>({
  status: null,
  role_id: null,
});
const resetForm = () => {
  userForm.name = ''
  userForm.full_name = ''
  userForm.email = ''
  userForm.emp_id = null
  userForm.password = ''
  userForm.role_id = null
  userForm.status = 'active'
}

const changesList = computed(() => {
  const changes = []
  if (dirtyFields.status) {
    if (bulkForm.status !== null) {
      const status = statusOptions.find(opt => opt.value === bulkForm.status)?.label
      changes.push({ label: 'Status', value: status, clear: false })
    } else {
      changes.push({ label: 'Status', value: '', clear: true })
    }
  }

  if (dirtyFields.role_id) {
    if (bulkForm.role_id !== null) {
      const role = roleOptions.value.find(opt => opt.value === bulkForm.role_id)?.label
      changes.push({ label: 'Role', value: role, clear: false })
    } else {
      changes.push({ label: 'Role', value: '', clear: true })
    }
  }
  return changes
})

const canSaveNext = computed(() => {
  return Boolean(
    userForm.name.trim() &&
    userForm.full_name.trim() &&
    userForm.password.trim() &&
    userForm.role_id &&
    userForm.status &&
    isEmailValid.value
  )
})

const canSubmit = computed(() => {
  const baseValid =
    !!userForm.name.trim() &&
    !!userForm.full_name.trim() &&
    !!userForm.role_id &&
    !!userForm.status &&
    isEmailValid.value

  // If editing, password can be blank; if adding, password is required
  const pwOk = editingUser.value
    ? true
    : userForm.password.trim().length > 0

  // Bulk mode bypasses single submit entirely
  if (bulkAddMode.value) {
    return pendingUsers.value.length > 0
  }
  return baseValid && pwOk
})


watch(showBulkModal, (visible) => {
  if (!visible) {
    Object.assign(bulkForm, {
      status: null,
      role_id: null,
    });
  }
});

const autoGeneratedName = ref(true)
watch(() => userForm.full_name, (newVal) => {
  const cleaned = (newVal || '').replace(/\s+/g, '').toLowerCase()
  if (autoGeneratedName.value || !userForm.name || userForm.name === cleaned) {
    userForm.name = cleaned
    autoGeneratedName.value = true
  }
})

watch(() => userForm.name, (newVal) => {
  const expectedAuto = (userForm.full_name || '').replace(/\s+/g, '').toLowerCase()
  if (newVal !== expectedAuto) {
    autoGeneratedName.value = false
  }
})
// Confirmation handler for bulk changes
function confirmBulkUpdate() {
  const hasChanges = Object.values(dirtyFields).some(v => v);
  if (!hasChanges) {
    message.warning('No changes to apply');
    return;
  }
  showBulkConfirm.value = true;
}
function handleSingleDelete(user: User) {
  selectedRowKeys.value = [user.id]
  showDeleteConfirm.value = true
}
function markFieldDirty(field: keyof typeof dirtyFields) {
  dirtyFields[field] = true
}

function resetBulkForm() {
  bulkForm.status = null;
  bulkForm.role_id = null;
  bulkGroups.value = [];
  // Explicitly reset each dirty field
  dirtyFields.status = false;
  dirtyFields.role_id = false;
  dirtyFields.department_id = false;
  dirtyFields.group_id = false;
}
function cancelBulkEdit() {
  showBulkModal.value = false
  resetBulkForm()
}
// Options
const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]
const roleOptions = ref<{ label: string; value: number }[]>([])

// Computed
const canWrite = computed(() => 
  authStore.user?.is_admin || // ✅ Now exists on user object
  hasPermission(authStore.user?.perms ?? [], 'usermanagement', 'write')
)
const filteredActiveUsers = computed(() =>
  users.value.filter(u => u.status === 'active' && matchSearch(u))
)
const filteredInactiveUsers = computed(() =>
  users.value.filter(u => u.status === 'inactive' && matchSearch(u))
)
function matchSearch(u: User) {
  return `${u.name} ${u.email} ${u.role.name} ${u.full_name} ${String(u.emp_id ?? '')}`
    .toLowerCase()
    .includes(searchQuery.value.toLowerCase())
}
const selectedUsers = computed(() =>
  users.value.filter(u => selectedRowKeys.value.includes(u.id))
)
const selectedUserNames = computed(() =>
  selectedUsers.value.map(u => u.name).join(', ')
)
// Columns
const userColumns = ref<DataTableColumns<User>>([
  { type: 'selection', width: 50, fixed: 'left' },
  { title: 'Username', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),render: r => h('div', { class: 'cell-content' }, r.name) },
  { title: 'Full Name', key: 'full_name', sorter: (a, b) => a.full_name.localeCompare(b.full_name),render: r => h('div', { class: 'cell-content' }, r.full_name) },
  { title: 'Email', key: 'email',  className: 'hidden-column', sorter: (a, b) => a.email.localeCompare(b.email),render: r => h('div', { class: 'cell-content' }, r.email) },
  { title: 'Emp ID', key: 'emp_id',render: r => h('div', { class: 'cell-content' }, r.emp_id != null ? String(r.emp_id) : '-'), sorter: (a, b) => (a.emp_id||0) - (b.emp_id||0) },
  { title: 'Role', key: 'role',  render: r => h('div', { class: 'cell-content' }, r.role.name), sorter: (a, b) => a.role.name.localeCompare(b.role.name) },
  { title: 'Status', key: 'status', className: 'hidden-column',render: r => h('div', { class: 'cell-content' }, r.status) },
  {
    title: 'Last Seen',
    key: 'last_seen',
    className: 'hidden-column',
    sorter: (a, b) =>
      (a.last_seen ? new Date(a.last_seen).getTime() : 0) -
      (b.last_seen ? new Date(b.last_seen).getTime() : 0),
    render: r =>
      h(
        'div',
        { class: 'cell-content' },
        r.last_seen ? new Date(r.last_seen).toLocaleString() : '-'
      )
  },

  {
    title: 'Permissions',
    key: 'permissions',
    render: user =>
      h(
        'div',
        { class: 'perm-cell' },
        [
          ...aclPages.value.map(page => {
            const perm = userEffectivePerms[user.id]?.[page.id] || 'none'
            if (perm === 'none') return null
            return h(NIcon, {
              component: page.iconComponent,
              size: 22,
              color: perm === 'write' ? '#237804' : '#d18d0f',
              title: `${page.name} (${perm})`
            })
          }),
          canWrite.value 
            ? h(NIcon, {
                component: iconMap.key,
                class: 'perm-edit-icon',
                size: 20,
                onClick: () => openUserPermissionsModal(user)
              })
            : null
        ].filter(Boolean)
      )
  },
  {
    title: 'Actions',
    key: 'actions',
    render: user =>
      canWrite.value 
        ? h('div', { class: 'action-buttons' }, [
            h(NIcon, {
              component: iconMap.edit,
              class: 'edit-icon',
              size: 20,
              onClick: () => openEditUserModal(user)
            }),
            h(NIcon, {
              component: iconMap.delete,
              class: 'delete-icon',
              size: 20,
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                handleSingleDelete(user)
              }
            })
          ])
        : null
  }
])


async function loadUserPagePerms(u: User) {
  const { data } = await api.get<{
    pages: { id: number; effective: PermBase; override: boolean; role_perm: PermBase }[]
  }>(`/api/users/${u.id}/page_permissions`)
  userEffectivePerms[u.id] = {}
  data.pages.forEach(p => {
    if (p.effective !== 'none') userEffectivePerms[u.id][p.id] = p.effective
  })
}
function getPermissionOptions(pageId: number) {
  const base = rolePermMap[pageId] || 'none'
  return [
    { label: 'None', value: 'none' },
    { label: `Inherit (${base})`, value: 'inherit' },
    { label: 'Read', value: 'read' },
    { label: 'Write', value: 'write' }
  ]
}
function getPermissionHint(pageId: number, cur: PermissionOp) {
  const base = rolePermMap[pageId] || 'none'
  if (cur === 'inherit') return `Inherit from role (${base})`
  if (cur === 'none') return 'Explicit none'
  return `Override (${base})`
}

async function fetchAll() {
  loadingUsers.value = true
  try {
    const res = await api.get<{ users: User[] }>('/api/users')
    users.value = res.data.users
    // now populate permissions for each one
    await Promise.all(users.value.map(u => loadUserPagePerms(u)))
  } finally {
    loadingUsers.value = false
  }
}

async function fetchACLPages() {
  const res = await api.get('/api/pages')
  const pagesData = Array.isArray(res.data)
    ? res.data
    : res.data.pages || []

  aclPages.value = pagesData.map((p: any) => {
    // EXACTLY as you had it originally:
    let iconKey = p.name.toLowerCase().replace('management', '')
    if (iconKey !== 'settings') {
      iconKey = iconKey.replace(/s$/, '')
    }
    return {
      id: Number(p.id),
      name: p.name,
      iconComponent: iconMap[iconKey as IconName] || iconMap.pages
    }
  })
}

function editPendingUser(index: number) {
  const user = pendingUsers.value[index]
  userForm.name = user.name
  userForm.full_name = user.full_name
  userForm.email = user.email
  userForm.emp_id = user.emp_id
  userForm.password = user.password
  editIndex.value = index
}
async function saveAndNext() {
  checkingDuplicates.value = true
  try {
    // 1. Required local fields
    if (!userForm.name.trim() || !userForm.full_name.trim() || !userForm.password.trim()) {
      message.error('Name and Password are required')
      return
    }

    // 2. Prepare duplicate check body
    const dupCheckBody: any = {
      name: userForm.name.trim(),
    }

    // Add optional fields if they exist
    if (userForm.email?.trim()) dupCheckBody.email = userForm.email.trim()
    if (userForm.emp_id) dupCheckBody.emp_id = userForm.emp_id
    if (editingUser.value) dupCheckBody.user_id = editingUser.value.id

    // 3. Local duplicate check in pending list
    const dupInPending = pendingUsers.value.find((u, i) => {
      // Skip current edit index
      if (i === editIndex.value) return false
      
      // Check name match
      if (u.name.toLowerCase() === userForm.name.trim().toLowerCase()) return true
      
      // Check email match if both exist
      if (userForm.email?.trim() && u.email && 
          u.email.toLowerCase() === userForm.email.trim().toLowerCase()) return true
      
      // Check emp_id match if both exist
      if (userForm.emp_id && u.emp_id && u.emp_id === userForm.emp_id) return true
      
      return false
    })

    if (dupInPending) {
      message.error('Duplicate in pending list - fix before saving')
      return
    }

    // 4. Server duplicate check
    try {
      const { data } = await api.post('/api/users/check-duplicates', dupCheckBody)
      if (data.exists) {
        message.error(`Duplicate found in: ${data.fields.join(', ')}`)
        return
      }
    } catch (error) {
      message.error('Duplicate check failed')
      return
    }

    // 5. Build PendingUser
    const pu: PendingUser = {
      name: userForm.name.trim(),
      full_name: userForm.full_name.trim(),
      email: userForm.email?.trim() || '',
      emp_id: userForm.emp_id || null,
      password: userForm.password,
      status: 'pending',
      role_id: userForm.role_id
    }

    // 6. Insert or replace
    if (editIndex.value !== null) {
      pendingUsers.value[editIndex.value] = pu
      editIndex.value = null
    } else {
      pendingUsers.value.push(pu)
    }

    // 7. Clear inputs
    userForm.name = ''
    userForm.full_name = ''
    userForm.email = ''
    userForm.emp_id = null
    userForm.password = ''
  } catch (err) {
    console.error('Error in saveAndNext:', err)
    message.error('Error adding to pending list')
  } finally {
    checkingDuplicates.value = false
  }
}

function removePendingUser(index: number) {
  pendingUsers.value.splice(index, 1)
  if (editIndex.value === index) {
    editIndex.value = null
    clearIndividualFields()
  }
}
function clearIndividualFields() {
  userForm.name = ''
  userForm.full_name = ''
  userForm.email = ''
  userForm.emp_id = null
  userForm.password = ''
}

async function finishBulkAdd() {
  if (pendingUsers.value.length === 0) {
    message.error('No users to add')
    return
  }


  try {
    // 2️⃣ Build payload, applying those meta‐fields to every pending user
      const usersPayload = pendingUsers.value.map(u => ({
        name: u.name,
        full_name: u.full_name,
        email: u.email || "",       // ← always include an email field
        emp_id: u.emp_id || undefined,
        password: u.password,
        role_id: userForm.role_id!,
        status: userForm.status!
      }))

    // 3️⃣ Debug: inspect the exact payload
    console.log('>> Bulk-add payload:', usersPayload)

    // 4️⃣ Send it
    const res = await api.post('/api/users/bulk', { users: usersPayload })

    // 5️⃣ Determine how many came back
    let added = 0
    if (Array.isArray(res.data.users)) {
      added = res.data.users.length
    } else if (typeof res.data.success_count === 'number') {
      added = res.data.success_count
    } else if (typeof res.data.message === 'string') {
      const m = res.data.message.match(/(\d+)/)
      added = m ? +m[1] : usersPayload.length
    }

    message.success(`Successfully added ${added} users`)

    // 6️⃣ Cleanup
    pendingUsers.value = []
    closeUserModal()
    await fetchAll()
  } catch (err: any) {
    console.error('Bulk-add error:', err.response?.data || err)
    if (err.response?.status === 207) {
      const body = err.response.data
      const ok = body.success_count || 0
      const fail = body.error_count || 0
      message.warning(`Added ${ok} users; ${fail} failed`)
      pendingUsers.value = []
      closeUserModal()
      await fetchAll()
      return
    }
    message.error('Bulk add failed—see console for details')
  }
}


function handleBulkModeChange (newValue: boolean) {
  if (!newValue) {
    bulkUsers.value = [];
  }
};
onMounted(async () => {
  await fetchRoles()
  await fetchACLPages()  
  await fetchAll()
})

async function performBulkDelete() {
  try {
    await api.delete('/api/users/bulk-delete', {
      data: { user_ids: selectedRowKeys.value }
    })
    message.success('Users deleted successfully')
    await fetchAll()
  } catch (error) {
    message.error('Bulk delete failed')
  } finally {
    selectedRowKeys.value = []
    showDeleteConfirm.value = false
  }
}

function openAddUserModal() {
  editingUser.value = null
  Object.assign(userForm, {
    name: '',
    full_name: '',
    email: '',
    emp_id: null,
    password: '',
    role_id: null,
    status: 'active',
    department_id: null,
    group_id: null
  })
  showUserModal.value = true
}
function openEditUserModal(u: User) {
  editingUser.value = u
  Object.assign(userForm, {
    name: u.name, full_name: u.full_name, email: u.email, emp_id: u.emp_id,
    password: '', role_id: u.role.id, status: u.status
  })
  showUserModal.value = true
}
function closeUserModal() {
  userForm.password = '';
  showUserModal.value = false;
  bulkAddMode.value = false;
  bulkUsers.value = [];
  resetForm();
};
async function submitUser() {
  // 1️⃣ Validate the form (including optional-email rule)
  const form = userFormRef.value
  if (!form) {
    message.error('Form not initialized')
    return
  }
  const isValid = await form.validate().catch(() => false)
  if (!isValid) {
    return // inline errors shown by <n-form>
  }

  // 2️⃣ Build the payload with only the fields your API expects
  const payload: Record<string, any> = {
    name: userForm.name.trim(),
    full_name: userForm.full_name,
    role_id: userForm.role_id,
    status: userForm.status
  }
  if (userForm.email?.trim()) {
    payload.email = userForm.email.trim()
  }
  if (userForm.emp_id != null) {
    payload.emp_id = userForm.emp_id
  }

  // 3️⃣ Include password: always for new users, only if set for edits
  const editing = Boolean(editingUser.value)
  if (!editing || userForm.password.trim()) {
    payload.password = userForm.password
  }

  // 4️⃣ Duplicate-check: send user_id so your Flask endpoint ignores that record
  const dupCheckBody: Record<string, any> = {
    name: userForm.name,
    emp_id: userForm.emp_id
  }
  if (editing && editingUser.value) { // Ensures value exists
    dupCheckBody.user_id = editingUser.value.id
  }
  if (editing) {
    dupCheckBody.user_id = editingUser.value!.id
  }

  const nameChanged = editingUser.value ? userForm.name !== editingUser.value.name : true
  const empChanged = editingUser.value ? userForm.emp_id !== editingUser.value.emp_id : true

  if (nameChanged || empChanged) {
    // ✅ Use the pre-built dupCheckBody (already handles user_id conditionally)
    const { data } = await api.post('/api/users/check-duplicates', dupCheckBody)
    if (data.exists) {
      message.error(`Duplicate found in: ${data.fields.join(', ')}`)
      return
    }
  }

  // 5️⃣ Submit to the correct endpoint
  try {
    if (editing) {
      // PATCH /api/users/:id
      await api.patch(`/api/users/${editingUser.value!.id}`, payload)
      message.success('User updated successfully')
    } else {
      // POST /api/users
      await api.post('/api/users', payload)
      message.success('User created successfully')
    }
    closeUserModal()
    await fetchAll()
  } catch (error) {
    // surface backend errors (e.g. 409 conflicts)
    const msg =
      error.response?.data?.message ||
      (editing ? 'Failed to update user' : 'Failed to create user')
    message.error(msg)
  }
}


async function fetchRoles() {
  try {
    const res = await api.get<{ roles: { id: number; name: string }[] }>('/api/roles')
    roleOptions.value = res.data.roles.map(r => ({ label: r.name, value: r.id }))
  } catch {
    message.error('Failed to load roles')
  }
}

async function openUserPermissionsModal(user: User) {
  editingUser.value = user
  showUserPermModal.value = false
  initialUserOverrides.value.clear()

  try {
    const res = await api.get<{
      pages: {
        id: number
        name: string
        effective: PermBase
        override: boolean
        role_perm: PermBase
      }[]
    }>(`/api/users/${user.id}/page_permissions`)

    // Rebuild the ACL pages list and populate permForm
    aclPages.value = res.data.pages.map(p => {
      // Track role-level default
      rolePermMap[p.id] = p.role_perm

      // Set form value to existing override or inherit
      permForm[p.id] = p.override ? p.effective : 'inherit'
      if (p.override) {
        initialUserOverrides.value.add(p.id)
      }

      // Map icon key exactly as elsewhere
      let iconKey = p.name.toLowerCase().replace('management', '')
      if (iconKey !== 'settings') iconKey = iconKey.replace(/s$/, '')

      return {
        id: p.id,
        name: p.name,
        iconComponent: iconMap[iconKey as IconName] || iconMap.pages
      }
    })

    showUserPermModal.value = true
  } catch (err) {
    console.error('Failed to load permissions', err)
    message.error('Could not load permissions')
  }
}

async function submitUserPermissions() {
  if (!editingUser.value) return
  savingPerms.value = true
  const uid = editingUser.value.id
  const toDelete = aclPages.value
    .filter(
      p => permForm[p.id] === 'inherit' && initialUserOverrides.value.has(p.id)
    )
    .map(p => p.id)
  const toUpsert = aclPages.value
    .filter(p => permForm[p.id] !== 'inherit')
    .map(p => ({ page_id: p.id, operation: permForm[p.id] }))
  if (toDelete.length) {
    await api.delete(`/api/users/${uid}/permissions`, {
      data: { page_ids: toDelete }
    })
  }
  if (toUpsert.length) {
    await api.put(`/api/users/${uid}/permissions`, {
      permissions: toUpsert
    })
  }
  message.success('Permissions saved')
  await loadUserPagePerms(editingUser.value)
  showUserPermModal.value = false
  savingPerms.value = false
}
async function performBulkUpdate() {
  try {
    // Collect only dirty fields
    const updates: Record<string, any> = {}
    
    if (dirtyFields.status) updates.status = bulkForm.status
    if (dirtyFields.role_id) updates.role_id = bulkForm.role_id

    await api.patch('/api/users/bulk-update', {
      user_ids: selectedRowKeys.value,
      updates
    })

    message.success(`Updated ${selectedRowKeys.value.length} users`)
    await fetchAll()
    showBulkModal.value = false
    showBulkConfirm.value = false
    resetBulkForm()
  } catch (error) {
    message.error('Bulk update failed')
  }
}

function closeUserPermissionsModal() {
  showUserPermModal.value = false
}
</script>

<style scoped lang="scss">
@use '@/styles/theme' as *;

/* Toolbar */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  align-items: center;
  margin-bottom: $spacing-md;
}

.search-input {
  flex: 1 1 200px;
  min-width: 150px;
  max-width: 250px;
}

.button-group {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.action-button {
  flex: 1 1 auto;
  min-width: 120px;
}

.bulk-action-buttons {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
  margin-left: auto;
}

/* Table & Data */
.user-table :deep(.n-data-table-wrapper) {
  overflow-x: auto;
  scrollbar-width: thin;
}

.user-table :deep(.cell-content) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  white-space: normal;
}

.user-table :deep(.n-data-table-table) {
  min-width: 400px;
}

.user-table.show-extras :deep(.n-data-table-table) {
  min-width: 700px;
}

/* Pending Users */
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: $spacing-md;
  margin-top: $spacing-sm;
}

/* Forms */
.user-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: $spacing-md;
}

.modal-card {
  padding: $spacing-sm $spacing-md;
  width: 95%;
  max-width: 580px;
  box-sizing: border-box;
  background-color: var(--card-bg);
}

.modal-card :deep(.n-card__content) {
  max-height: 60vh;
  overflow-y: auto;
}

/* Permission Modal */
.perm-modal .n-modal-body-wrapper {
  display: flex;
  justify-content: center;
}

.modal-card :deep(.perm-row) {
  margin-bottom: $spacing-xs;
  gap: $spacing-sm;
  align-items: center;
}

.modal-card :deep(.perm-hint) {
  margin-left: $spacing-xs;
  font-size: 0.9em;
  color: var(--text-secondary);
}

/* Action Icons */
.perm-cell {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.action-buttons {
  display: flex;
  gap: $spacing-sm;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: $spacing-xs;
    overflow-x: auto;
    padding-bottom: $spacing-xs;
  }

  .search-input {
    max-width: 180px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-sm;
  }

  .search-input {
    max-width: 100%;
  }

  .cards-container {
    grid-template-columns: 1fr;
  }

  .modal-card {
    padding: $spacing-xs $spacing-sm;
  }

  .modal-card :deep(.perm-row) {
    margin-bottom: $spacing-xs;
    gap: $spacing-xs;
  }
}
</style>