<template>
  <div class="settings-container">
    <n-card>
      <template #header>
        <n-h2>Settings</n-h2>
      </template>
      <template #header-extra>
        <n-text depth="3" v-if="canAccess('Settings', 'write')">
          (You have write access)
        </n-text>
        <n-text depth="3" v-else-if="canAccess('Settings', 'read')">
          (Read-only mode)
        </n-text>
        <n-text depth="3" v-else>
          (No access)
        </n-text>
      </template>

      <n-tabs v-model:value="activeTab">
        <!-- Roles Tab -->
        <n-tab-pane name="roles" tab="Roles">
          <div class="table-controls">
            <PermissionWrapper resource="settings" operation="write">
              <n-button type="primary" @click="openAddRoleModal">
                Add Role
              </n-button>
            </PermissionWrapper>
          </div>
          <n-data-table
            :columns="roleColumns"
            :data="roles"
            :loading="loadingRoles"
            :pagination="{ pageSize: 10 }"
          />
        </n-tab-pane>

        <!-- Pages Tab -->
        <n-tab-pane name="pages" tab="Pages">
          <div class="table-controls">
            <PermissionWrapper resource="settings" operation="write">
              <n-button type="primary" @click="openAddPageModal">
                Add Page
              </n-button>
            </PermissionWrapper>
          </div>
          <n-data-table
            :columns="pageColumns"
            :data="pages"
            :loading="loadingPages"
            :pagination="{ pageSize: 10 }"
          />
        </n-tab-pane>
      </n-tabs>

      <!-- Role Add/Edit Modal -->
      <n-modal
        v-model:show="showRoleModal"
        :title="editingRole ? 'Edit Role' : 'Add Role'"
        :mask-closable="false"
      >
        <n-card class="modal-card">
          <n-form ref="roleFormRef" :model="roleForm">
            <n-form-item label="Name" path="name">
              <n-input v-model:value="roleForm.name" />
            </n-form-item>
            <n-form-item label="Description" path="description">
              <n-input v-model:value="roleForm.description" />
            </n-form-item>
          </n-form>
          <template #footer>
            <n-button class="compact-button" @click="closeRoleModal">Cancel</n-button>
            <PermissionWrapper resource="settings" operation="write">
              <n-button class="compact-button" type="primary" @click="submitRole">
                {{ editingRole ? 'Update' : 'Add' }}
              </n-button>
            </PermissionWrapper>
          </template>
        </n-card>
      </n-modal>

      <!-- Role Permissions Modal -->
      <n-modal
        v-model:show="showRolePermModal"
        title="Edit Role Permissions"
        :mask-closable="false"
      >
        <n-card class="modal-card">
          <n-form :model="rolePermForm" ref="rolePermFormRef">
            <div v-for="page in pages" :key="page.id" class="perm-row">
              <div class="perm-label">{{ page.name }}</div>
              <n-select
                v-model:value="rolePermForm[page.id]"
                :options="permissionOptions"
                style="flex:1"
              />
            </div>
          </n-form>
          <template #footer>
            <n-space justify="space-between" align="center" class="perm-footer-space">
              <n-button class="compact-button" @click="closeRolePermModal">Cancel</n-button>
              <PermissionWrapper resource="settings" operation="write">
                <n-button class="compact-button" type="primary" @click="submitRolePerms">
                  Save
                </n-button>
              </PermissionWrapper>
            </n-space>
          </template>
        </n-card>
      </n-modal>
      
      <!-- Page Add/Edit Modal -->
      <n-modal
        v-model:show="showPageModal"
        :title="editingPage ? 'Edit Page' : 'Add Page'"
        :mask-closable="false"
      >
        <n-card class="modal-card">
          <n-form ref="pageFormRef" :model="pageForm">
            <n-form-item label="Page Name" path="name">
              <n-input v-model:value="pageForm.name" />
            </n-form-item>
            <n-form-item label="Route" path="route">
              <n-input v-model:value="pageForm.route" />
            </n-form-item>
          </n-form>
          <template #footer>
            <n-button class="compact-button" @click="closePageModal">Cancel</n-button>
            <PermissionWrapper resource="settings" operation="write">
              <n-button class="compact-button" type="primary" @click="submitPage">
                {{ editingPage ? 'Update' : 'Add' }}
              </n-button>
            </PermissionWrapper>
          </template>
        </n-card>
      </n-modal>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive,computed, watchEffect, onMounted, h } from 'vue'
import { useMessage} from 'naive-ui'
import api from '@/api'
import PermissionWrapper from '@/components/PermissionWrapper.vue'
import {
  NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal,
  NTabs, NTabPane, NSelect, NText, NIcon
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { iconMap } from '@/utils/iconMap'
import { useRouter } from 'vue-router'

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

// Tabs
const activeTab = ref<'roles' | 'pages'>('roles')

// State
const roles = ref<any[]>([])
const pages = ref<any[]>([])
const loadingRoles = ref(false)
const loadingPages = ref(false)

// Role Modals
const showRoleModal = ref(false)
const editingRole = ref<any>(null)
const roleForm = reactive({ name: '', description: '' })

// Role-Perms Modal
const showRolePermModal = ref(false)
const rolePermForm = reactive<Record<string, 'none'|'read'|'write'>>({})

// Page Modals
const showPageModal = ref(false)
const editingPage = ref<any>(null)
const pageForm = reactive({ name: '', route: '' })

// Permission options
const permissionOptions = [
  { label: 'None', value: 'none' },
  { label: 'Read', value: 'read' },
  { label: 'Read/Write', value: 'write' }
]

// Permission check helper
function canAccess(page: string, op: 'read' | 'write'): boolean {
  return auth.hasPermission('settings', op)  // Direct settings check
}
function hasAccess() {
  return auth.hasPermission('settings', 'read') || 
         auth.hasPermission('settings', 'write');
}
// Fetching
async function fetchPages() {
  try {
    const res = await api.get('/api/pages', {
      headers: { 
        'X-Resource': 'settings',
        'X-Operation': 'read'  // Explicit operation
      }
    });
    pages.value = res.data.map(p => ({
      ...p,
      iconComponent: iconMap[p.name.toLowerCase()] || iconMap.pages
    }));
  } catch (err) {
    message.error('Failed to load pages');
    pages.value = [];
  }
}
async function fetchRoles() {
  loadingRoles.value = true;
  try {
    const rolesRes = await api.get('/api/roles', {
      headers: {
        'X-Resource': 'settings',
        'X-Operation': 'read'
      }
    });

    const rolesData = rolesRes.data.roles || rolesRes.data;
    
    const rolesWithPermissions = await Promise.all(
      rolesData.map(async (role: any) => {
        try {
          const permRes = await api.get(`/api/roles/${role.id}/permissions`, {
            headers: {  // Add headers for nested endpoint
              'X-Resource': 'role',
              'X-Operation': 'read'
            }
          });
          
          return {
            ...role,
            permissions: permRes.data?.permissions || [],
            perms_metadata: []
          };
        } catch (err) {
          console.error(`Failed to load permissions for role ${role.id}:`, err);
          return {
            ...role,
            permissions: [],
            perms_metadata: []
          };
        }
      })
    );

    // Add null check for pages.value
    if (pages.value) {
      roles.value = rolesWithPermissions.map(role => ({
        ...role,
        perms_metadata: pages.value.map(page => {
          const p = role.permissions.find((x: any) => Number(x.page_id) === page.id);
          return {
            page_id: page.id,
            crud_operation: p?.crud_operation?.toLowerCase() || 'none'
          };
        })
      }));
    } else {
      roles.value = rolesWithPermissions;
    }
  } catch (err: any) {
    if (err.response?.status === 403) {
      message.warning('You do not have permission to view roles.');
    } else {
      message.error('Failed to load roles list');
    }
    roles.value = [];
  } finally {
    loadingRoles.value = false;
  }
}


// Role CRUD
function openAddRoleModal() {
  editingRole.value = null
  Object.assign(roleForm, { name: '', description: '' })
  showRoleModal.value = true
}
function openEditRoleModal(r: any) {
  editingRole.value = r
  Object.assign(roleForm, { name: r.name, description: r.description })
  showRoleModal.value = true
}
function closeRoleModal() {
  showRoleModal.value = false
}
async function submitRole() {
  try {
    if (editingRole.value) {
      await api.patch(`/api/roles/${editingRole.value.id}`, roleForm)
      message.success('Role updated')
    } else {
      await api.post('/api/roles', roleForm)
      message.success('Role created')
    }
    closeRoleModal()
    await fetchRoles()
  } catch {
    message.error('Failed to save role.')
  }
}
async function deleteRole(r: any) {
  if (!confirm(`Delete role "${r.name}"?`)) return
  await api.delete(`/api/roles/${r.id}`)
  await fetchRoles()
}

// Role-Perms CRUD
function openRolePermModal(r: any) {
  editingRole.value = r
  Object.keys(rolePermForm).forEach(k => delete rolePermForm[k])
  r.perms_metadata.forEach((perm: any) => {
    if (perm.crud_operation !== 'none') rolePermForm[perm.page_id] = perm.crud_operation
  })
  showRolePermModal.value = true
}
function closeRolePermModal() {
  showRolePermModal.value = false
}
async function submitRolePerms() {
  const perms = Object.entries(rolePermForm)
    .filter(([, lvl]) => lvl !== 'none')
    .map(([pid, lvl]) => ({ page_id: Number(pid), crud_operation: lvl }))
  await api.put(`/api/roles/${editingRole.value.id}/permissions`, { permissions: perms })
  message.success('Permissions updated')
  closeRolePermModal()
  await fetchRoles()
}

// Page CRUD
function openAddPageModal() {
  editingPage.value = null
  Object.assign(pageForm, { name: '', route: '' })
  showPageModal.value = true
}
function openEditPageModal(p: any) {
  editingPage.value = p
  Object.assign(pageForm, { name: p.name, route: p.route })
  showPageModal.value = true
}
function closePageModal() {
  showPageModal.value = false
}
async function submitPage() {
  try {
    if (editingPage.value) {
      await api.patch(`/api/pages/${editingPage.value.id}`, pageForm)
      message.success('Page updated')
    } else {
      await api.post('/api/pages', pageForm)
      message.success('Page created')
    }
    closePageModal()
    await fetchPages()
  } catch {
    message.error('Failed to save page.')
  }
}
async function deletePage(p: any) {
  if (!confirm(`Delete page "${p.name}"?`)) return
  await api.delete(`/api/pages/${p.id}`)
  await fetchPages()
}

// Table column definitions
const roleColumns = [
  { title: 'Name', key: 'name' },
  {
    title: 'Permissions',
    key: 'permissions',
    render: (row: any) => {
      return h('div', { class: 'perm-cell' }, [
        ...pages.value.map(page => {
          const perm = row.perms_metadata.find((p: any) =>
            p.page_id === page.id && p.crud_operation !== 'none'
          )
          if (!perm) return null
          return h(NIcon, {
            component: page.iconComponent,
            class: 'perm-icon',
            size: 22,
            color: perm.crud_operation === 'write' ? '#237804' : '#d18d0f',
            title: `${page.name} (${perm.crud_operation})`
          })
        }),
        h(PermissionWrapper, { resource:"settings", operation:"write" }, {
          default: () => h(NIcon, {
            component: iconMap.key,
            class: 'perm-edit-icon',
            size: 20,
            onClick: () => openRolePermModal(row)
          })
        })
      ])
    }
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (row: any) =>
      h('div', { class: 'action-buttons' }, [
        h(PermissionWrapper, { resource:"settings", operation:"write" }, {
          default: () => [
            h(NIcon, {
              component: iconMap.edit,
              class: 'edit-icon',
              size: 20,
              onClick: () => openEditRoleModal(row)
            }),
            h(NIcon, {
              component: iconMap.delete,
              class: 'delete-icon',
              size: 20,
              onClick: () => deleteRole(row)
            })
          ]
        })
      ])
  }
]

const pageColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Route', key: 'route' },
  {
    title: 'Actions',
    key: 'actions',
    render: (row: any) =>
      h('div', { class: 'action-buttons' }, [
        h(PermissionWrapper, { resource:"settings", operation:"write" }, {
          default: () => [
            h(NIcon, {
              component: iconMap.edit,
              class: 'edit-icon',
              size: 20,
              onClick: () => openEditPageModal(row)
            }),
            h(NIcon, {
              component: iconMap.delete,
              class: 'delete-icon',
              size: 20,   
              onClick: () => deletePage(row)
            })
          ]
        })
      ])
  }
]

onMounted(() => {
  // Load all data regardless of initial tab
  Promise.all([fetchPages(), fetchRoles()])
    .catch(err => console.error('Initial load error:', err));
  
  watchEffect(async () => {
    if (!auth.isLoggedIn || !hasAccess()) {
      router.push('/dashboard');
    }
  });
});
</script>

<style scoped lang="scss">

@use '@/styles/theme' as *;

/* ===== Global Layout ===== */

.action-icon {
  margin-right: 4px;
  cursor: pointer;
}
.search-input :deep(.n-input__input) {
  padding: 4px 10px;
  font-size: 13px;
}


/* Icon hover enhancement only */
.edit-icon, .delete-icon {
  filter: brightness(1.3);
  transition: all 0.2s ease;
  
  &:hover {
    filter: brightness(1.8);
    transform: scale(1.1);
  }
}
/* ===== Forms (Add/Edit) ===== */
.form-section {
  margin-bottom: 1rem;
}

.n-form-item {
  margin-bottom: 12px;
}

/* ===== User/Role/Page Table Tweaks ===== */

.table-wrapper {
  overflow-x: auto;
}

.permissions-icon {
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
  color: var(--text-color);
}

.permissions-icon:hover {
  transform: scale(1.2);
  color: var(--primary-color);
}

/* Modal */
.modal-card {
  max-width: 600px;
  margin: 0 auto;
  background-color: var(--card-bg);
}

.modal-card :deep(.n-card__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
}

@media (max-width: 480px) {
  .modal-card :deep(.n-card__footer) {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
