import { ref, reactive, watchEffect, onMounted, h } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/api';
import PermissionWrapper from '@/components/PermissionWrapper.vue';
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NTabs, NTabPane, NSelect, NText, NIcon } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { iconMap } from '@/utils/iconMap';
import { useRouter } from 'vue-router';
const router = useRouter();
const message = useMessage();
const auth = useAuthStore();
// Tabs
const activeTab = ref('roles');
// State
const roles = ref([]);
const pages = ref([]);
const loadingRoles = ref(false);
const loadingPages = ref(false);
// Role Modals
const showRoleModal = ref(false);
const editingRole = ref(null);
const roleForm = reactive({ name: '', description: '' });
// Role-Perms Modal
const showRolePermModal = ref(false);
const rolePermForm = reactive({});
// Page Modals
const showPageModal = ref(false);
const editingPage = ref(null);
const pageForm = reactive({ name: '', route: '' });
// Permission options
const permissionOptions = [
    { label: 'None', value: 'none' },
    { label: 'Read', value: 'read' },
    { label: 'Read/Write', value: 'write' }
];
// Permission check helper
function canAccess(page, op) {
    return auth.hasPermission('settings', op); // Direct settings check
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
                'X-Operation': 'read' // Explicit operation
            }
        });
        pages.value = res.data.map(p => ({
            ...p,
            iconComponent: iconMap[p.name.toLowerCase()] || iconMap.pages
        }));
    }
    catch (err) {
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
        const rolesWithPermissions = await Promise.all(rolesData.map(async (role) => {
            try {
                const permRes = await api.get(`/api/roles/${role.id}/permissions`, {
                    headers: {
                        'X-Resource': 'role',
                        'X-Operation': 'read'
                    }
                });
                return {
                    ...role,
                    permissions: permRes.data?.permissions || [],
                    perms_metadata: []
                };
            }
            catch (err) {
                console.error(`Failed to load permissions for role ${role.id}:`, err);
                return {
                    ...role,
                    permissions: [],
                    perms_metadata: []
                };
            }
        }));
        // Add null check for pages.value
        if (pages.value) {
            roles.value = rolesWithPermissions.map(role => ({
                ...role,
                perms_metadata: pages.value.map(page => {
                    const p = role.permissions.find((x) => Number(x.page_id) === page.id);
                    return {
                        page_id: page.id,
                        crud_operation: p?.crud_operation?.toLowerCase() || 'none'
                    };
                })
            }));
        }
        else {
            roles.value = rolesWithPermissions;
        }
    }
    catch (err) {
        if (err.response?.status === 403) {
            message.warning('You do not have permission to view roles.');
        }
        else {
            message.error('Failed to load roles list');
        }
        roles.value = [];
    }
    finally {
        loadingRoles.value = false;
    }
}
// Role CRUD
function openAddRoleModal() {
    editingRole.value = null;
    Object.assign(roleForm, { name: '', description: '' });
    showRoleModal.value = true;
}
function openEditRoleModal(r) {
    editingRole.value = r;
    Object.assign(roleForm, { name: r.name, description: r.description });
    showRoleModal.value = true;
}
function closeRoleModal() {
    showRoleModal.value = false;
}
async function submitRole() {
    try {
        if (editingRole.value) {
            await api.patch(`/api/roles/${editingRole.value.id}`, roleForm);
            message.success('Role updated');
        }
        else {
            await api.post('/api/roles', roleForm);
            message.success('Role created');
        }
        closeRoleModal();
        await fetchRoles();
    }
    catch {
        message.error('Failed to save role.');
    }
}
async function deleteRole(r) {
    if (!confirm(`Delete role "${r.name}"?`))
        return;
    await api.delete(`/api/roles/${r.id}`);
    await fetchRoles();
}
// Role-Perms CRUD
function openRolePermModal(r) {
    editingRole.value = r;
    Object.keys(rolePermForm).forEach(k => delete rolePermForm[k]);
    r.perms_metadata.forEach((perm) => {
        if (perm.crud_operation !== 'none')
            rolePermForm[perm.page_id] = perm.crud_operation;
    });
    showRolePermModal.value = true;
}
function closeRolePermModal() {
    showRolePermModal.value = false;
}
async function submitRolePerms() {
    const perms = Object.entries(rolePermForm)
        .filter(([, lvl]) => lvl !== 'none')
        .map(([pid, lvl]) => ({ page_id: Number(pid), crud_operation: lvl }));
    await api.put(`/api/roles/${editingRole.value.id}/permissions`, { permissions: perms });
    message.success('Permissions updated');
    closeRolePermModal();
    await fetchRoles();
}
// Page CRUD
function openAddPageModal() {
    editingPage.value = null;
    Object.assign(pageForm, { name: '', route: '' });
    showPageModal.value = true;
}
function openEditPageModal(p) {
    editingPage.value = p;
    Object.assign(pageForm, { name: p.name, route: p.route });
    showPageModal.value = true;
}
function closePageModal() {
    showPageModal.value = false;
}
async function submitPage() {
    try {
        if (editingPage.value) {
            await api.patch(`/api/pages/${editingPage.value.id}`, pageForm);
            message.success('Page updated');
        }
        else {
            await api.post('/api/pages', pageForm);
            message.success('Page created');
        }
        closePageModal();
        await fetchPages();
    }
    catch {
        message.error('Failed to save page.');
    }
}
async function deletePage(p) {
    if (!confirm(`Delete page "${p.name}"?`))
        return;
    await api.delete(`/api/pages/${p.id}`);
    await fetchPages();
}
// Table column definitions
const roleColumns = [
    { title: 'Name', key: 'name' },
    {
        title: 'Permissions',
        key: 'permissions',
        render: (row) => {
            return h('div', { class: 'perm-cell' }, [
                ...pages.value.map(page => {
                    const perm = row.perms_metadata.find((p) => p.page_id === page.id && p.crud_operation !== 'none');
                    if (!perm)
                        return null;
                    return h(NIcon, {
                        component: page.iconComponent,
                        class: 'perm-icon',
                        size: 22,
                        color: perm.crud_operation === 'write' ? '#237804' : '#d18d0f',
                        title: `${page.name} (${perm.crud_operation})`
                    });
                }),
                h(PermissionWrapper, { resource: "settings", operation: "write" }, {
                    default: () => h(NIcon, {
                        component: iconMap.key,
                        class: 'perm-edit-icon',
                        size: 20,
                        onClick: () => openRolePermModal(row)
                    })
                })
            ]);
        }
    },
    {
        title: 'Actions',
        key: 'actions',
        render: (row) => h('div', { class: 'action-buttons' }, [
            h(PermissionWrapper, { resource: "settings", operation: "write" }, {
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
];
const pageColumns = [
    { title: 'Name', key: 'name' },
    { title: 'Route', key: 'route' },
    {
        title: 'Actions',
        key: 'actions',
        render: (row) => h('div', { class: 'action-buttons' }, [
            h(PermissionWrapper, { resource: "settings", operation: "write" }, {
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
];
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['permissions-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['n-card__footer']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-container" },
});
const __VLS_0 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_3.slots;
    const __VLS_4 = {}.NH2;
    /** @type {[typeof __VLS_components.NH2, typeof __VLS_components.nH2, typeof __VLS_components.NH2, typeof __VLS_components.nH2, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
    const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    var __VLS_7;
}
{
    const { 'header-extra': __VLS_thisSlot } = __VLS_3.slots;
    if (__VLS_ctx.canAccess('Settings', 'write')) {
        const __VLS_8 = {}.NText;
        /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            depth: "3",
        }));
        const __VLS_10 = __VLS_9({
            depth: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
        var __VLS_11;
    }
    else if (__VLS_ctx.canAccess('Settings', 'read')) {
        const __VLS_12 = {}.NText;
        /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            depth: "3",
        }));
        const __VLS_14 = __VLS_13({
            depth: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_15.slots.default;
        var __VLS_15;
    }
    else {
        const __VLS_16 = {}.NText;
        /** @type {[typeof __VLS_components.NText, typeof __VLS_components.nText, typeof __VLS_components.NText, typeof __VLS_components.nText, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            depth: "3",
        }));
        const __VLS_18 = __VLS_17({
            depth: "3",
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        var __VLS_19;
    }
}
const __VLS_20 = {}.NTabs;
/** @type {[typeof __VLS_components.NTabs, typeof __VLS_components.nTabs, typeof __VLS_components.NTabs, typeof __VLS_components.nTabs, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    value: (__VLS_ctx.activeTab),
}));
const __VLS_22 = __VLS_21({
    value: (__VLS_ctx.activeTab),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
const __VLS_24 = {}.NTabPane;
/** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    name: "roles",
    tab: "Roles",
}));
const __VLS_26 = __VLS_25({
    name: "roles",
    tab: "Roles",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-controls" },
});
/** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
    resource: "settings",
    operation: "write",
}));
const __VLS_29 = __VLS_28({
    resource: "settings",
    operation: "write",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_30.slots.default;
const __VLS_31 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_33 = __VLS_32({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
let __VLS_35;
let __VLS_36;
let __VLS_37;
const __VLS_38 = {
    onClick: (__VLS_ctx.openAddRoleModal)
};
__VLS_34.slots.default;
var __VLS_34;
var __VLS_30;
const __VLS_39 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    columns: (__VLS_ctx.roleColumns),
    data: (__VLS_ctx.roles),
    loading: (__VLS_ctx.loadingRoles),
    pagination: ({ pageSize: 10 }),
}));
const __VLS_41 = __VLS_40({
    columns: (__VLS_ctx.roleColumns),
    data: (__VLS_ctx.roles),
    loading: (__VLS_ctx.loadingRoles),
    pagination: ({ pageSize: 10 }),
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
var __VLS_27;
const __VLS_43 = {}.NTabPane;
/** @type {[typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, typeof __VLS_components.NTabPane, typeof __VLS_components.nTabPane, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    name: "pages",
    tab: "Pages",
}));
const __VLS_45 = __VLS_44({
    name: "pages",
    tab: "Pages",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_46.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-controls" },
});
/** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
    resource: "settings",
    operation: "write",
}));
const __VLS_48 = __VLS_47({
    resource: "settings",
    operation: "write",
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
__VLS_49.slots.default;
const __VLS_50 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_52 = __VLS_51({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
let __VLS_54;
let __VLS_55;
let __VLS_56;
const __VLS_57 = {
    onClick: (__VLS_ctx.openAddPageModal)
};
__VLS_53.slots.default;
var __VLS_53;
var __VLS_49;
const __VLS_58 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
    columns: (__VLS_ctx.pageColumns),
    data: (__VLS_ctx.pages),
    loading: (__VLS_ctx.loadingPages),
    pagination: ({ pageSize: 10 }),
}));
const __VLS_60 = __VLS_59({
    columns: (__VLS_ctx.pageColumns),
    data: (__VLS_ctx.pages),
    loading: (__VLS_ctx.loadingPages),
    pagination: ({ pageSize: 10 }),
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
var __VLS_46;
var __VLS_23;
const __VLS_62 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
    show: (__VLS_ctx.showRoleModal),
    title: (__VLS_ctx.editingRole ? 'Edit Role' : 'Add Role'),
    maskClosable: (false),
}));
const __VLS_64 = __VLS_63({
    show: (__VLS_ctx.showRoleModal),
    title: (__VLS_ctx.editingRole ? 'Edit Role' : 'Add Role'),
    maskClosable: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
__VLS_65.slots.default;
const __VLS_66 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    ...{ class: "modal-card" },
}));
const __VLS_68 = __VLS_67({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
__VLS_69.slots.default;
const __VLS_70 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    ref: "roleFormRef",
    model: (__VLS_ctx.roleForm),
}));
const __VLS_72 = __VLS_71({
    ref: "roleFormRef",
    model: (__VLS_ctx.roleForm),
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
/** @type {typeof __VLS_ctx.roleFormRef} */ ;
var __VLS_74 = {};
__VLS_73.slots.default;
const __VLS_76 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "Name",
    path: "name",
}));
const __VLS_78 = __VLS_77({
    label: "Name",
    path: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    value: (__VLS_ctx.roleForm.name),
}));
const __VLS_82 = __VLS_81({
    value: (__VLS_ctx.roleForm.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
var __VLS_79;
const __VLS_84 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "Description",
    path: "description",
}));
const __VLS_86 = __VLS_85({
    label: "Description",
    path: "description",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    value: (__VLS_ctx.roleForm.description),
}));
const __VLS_90 = __VLS_89({
    value: (__VLS_ctx.roleForm.description),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
var __VLS_87;
var __VLS_73;
{
    const { footer: __VLS_thisSlot } = __VLS_69.slots;
    const __VLS_92 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onClick: (__VLS_ctx.closeRoleModal)
    };
    __VLS_95.slots.default;
    var __VLS_95;
    /** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
        resource: "settings",
        operation: "write",
    }));
    const __VLS_101 = __VLS_100({
        resource: "settings",
        operation: "write",
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    __VLS_102.slots.default;
    const __VLS_103 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
        type: "primary",
    }));
    const __VLS_105 = __VLS_104({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    let __VLS_107;
    let __VLS_108;
    let __VLS_109;
    const __VLS_110 = {
        onClick: (__VLS_ctx.submitRole)
    };
    __VLS_106.slots.default;
    (__VLS_ctx.editingRole ? 'Update' : 'Add');
    var __VLS_106;
    var __VLS_102;
}
var __VLS_69;
var __VLS_65;
const __VLS_111 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    show: (__VLS_ctx.showRolePermModal),
    title: "Edit Role Permissions",
    maskClosable: (false),
}));
const __VLS_113 = __VLS_112({
    show: (__VLS_ctx.showRolePermModal),
    title: "Edit Role Permissions",
    maskClosable: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
__VLS_114.slots.default;
const __VLS_115 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
    ...{ class: "modal-card" },
}));
const __VLS_117 = __VLS_116({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
__VLS_118.slots.default;
const __VLS_119 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
    model: (__VLS_ctx.rolePermForm),
    ref: "rolePermFormRef",
}));
const __VLS_121 = __VLS_120({
    model: (__VLS_ctx.rolePermForm),
    ref: "rolePermFormRef",
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
/** @type {typeof __VLS_ctx.rolePermFormRef} */ ;
var __VLS_123 = {};
__VLS_122.slots.default;
for (const [page] of __VLS_getVForSourceType((__VLS_ctx.pages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (page.id),
        ...{ class: "perm-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "perm-label" },
    });
    (page.name);
    const __VLS_125 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
        value: (__VLS_ctx.rolePermForm[page.id]),
        options: (__VLS_ctx.permissionOptions),
        ...{ style: {} },
    }));
    const __VLS_127 = __VLS_126({
        value: (__VLS_ctx.rolePermForm[page.id]),
        options: (__VLS_ctx.permissionOptions),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_126));
}
var __VLS_122;
{
    const { footer: __VLS_thisSlot } = __VLS_118.slots;
    const __VLS_129 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_130 = __VLS_asFunctionalComponent(__VLS_129, new __VLS_129({
        justify: "space-between",
        align: "center",
        ...{ class: "perm-footer-space" },
    }));
    const __VLS_131 = __VLS_130({
        justify: "space-between",
        align: "center",
        ...{ class: "perm-footer-space" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_130));
    __VLS_132.slots.default;
    const __VLS_133 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_134 = __VLS_asFunctionalComponent(__VLS_133, new __VLS_133({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
    }));
    const __VLS_135 = __VLS_134({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_134));
    let __VLS_137;
    let __VLS_138;
    let __VLS_139;
    const __VLS_140 = {
        onClick: (__VLS_ctx.closeRolePermModal)
    };
    __VLS_136.slots.default;
    var __VLS_136;
    /** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
        resource: "settings",
        operation: "write",
    }));
    const __VLS_142 = __VLS_141({
        resource: "settings",
        operation: "write",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    const __VLS_144 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
        type: "primary",
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (__VLS_ctx.submitRolePerms)
    };
    __VLS_147.slots.default;
    var __VLS_147;
    var __VLS_143;
    var __VLS_132;
}
var __VLS_118;
var __VLS_114;
const __VLS_152 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    show: (__VLS_ctx.showPageModal),
    title: (__VLS_ctx.editingPage ? 'Edit Page' : 'Add Page'),
    maskClosable: (false),
}));
const __VLS_154 = __VLS_153({
    show: (__VLS_ctx.showPageModal),
    title: (__VLS_ctx.editingPage ? 'Edit Page' : 'Add Page'),
    maskClosable: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
const __VLS_156 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    ...{ class: "modal-card" },
}));
const __VLS_158 = __VLS_157({
    ...{ class: "modal-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
const __VLS_160 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    ref: "pageFormRef",
    model: (__VLS_ctx.pageForm),
}));
const __VLS_162 = __VLS_161({
    ref: "pageFormRef",
    model: (__VLS_ctx.pageForm),
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
/** @type {typeof __VLS_ctx.pageFormRef} */ ;
var __VLS_164 = {};
__VLS_163.slots.default;
const __VLS_166 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
    label: "Page Name",
    path: "name",
}));
const __VLS_168 = __VLS_167({
    label: "Page Name",
    path: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
__VLS_169.slots.default;
const __VLS_170 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    value: (__VLS_ctx.pageForm.name),
}));
const __VLS_172 = __VLS_171({
    value: (__VLS_ctx.pageForm.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
var __VLS_169;
const __VLS_174 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    label: "Route",
    path: "route",
}));
const __VLS_176 = __VLS_175({
    label: "Route",
    path: "route",
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
__VLS_177.slots.default;
const __VLS_178 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    value: (__VLS_ctx.pageForm.route),
}));
const __VLS_180 = __VLS_179({
    value: (__VLS_ctx.pageForm.route),
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
var __VLS_177;
var __VLS_163;
{
    const { footer: __VLS_thisSlot } = __VLS_159.slots;
    const __VLS_182 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
    }));
    const __VLS_184 = __VLS_183({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    let __VLS_186;
    let __VLS_187;
    let __VLS_188;
    const __VLS_189 = {
        onClick: (__VLS_ctx.closePageModal)
    };
    __VLS_185.slots.default;
    var __VLS_185;
    /** @type {[typeof PermissionWrapper, typeof PermissionWrapper, ]} */ ;
    // @ts-ignore
    const __VLS_190 = __VLS_asFunctionalComponent(PermissionWrapper, new PermissionWrapper({
        resource: "settings",
        operation: "write",
    }));
    const __VLS_191 = __VLS_190({
        resource: "settings",
        operation: "write",
    }, ...__VLS_functionalComponentArgsRest(__VLS_190));
    __VLS_192.slots.default;
    const __VLS_193 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
        type: "primary",
    }));
    const __VLS_195 = __VLS_194({
        ...{ 'onClick': {} },
        ...{ class: "compact-button" },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    let __VLS_197;
    let __VLS_198;
    let __VLS_199;
    const __VLS_200 = {
        onClick: (__VLS_ctx.submitPage)
    };
    __VLS_196.slots.default;
    (__VLS_ctx.editingPage ? 'Update' : 'Add');
    var __VLS_196;
    var __VLS_192;
}
var __VLS_159;
var __VLS_155;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['settings-container']} */ ;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-button']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['perm-row']} */ ;
/** @type {__VLS_StyleScopedClasses['perm-label']} */ ;
/** @type {__VLS_StyleScopedClasses['perm-footer-space']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-button']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-button']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-card']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-button']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-button']} */ ;
// @ts-ignore
var __VLS_75 = __VLS_74, __VLS_124 = __VLS_123, __VLS_165 = __VLS_164;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            PermissionWrapper: PermissionWrapper,
            NButton: NButton,
            NCard: NCard,
            NDataTable: NDataTable,
            NForm: NForm,
            NFormItem: NFormItem,
            NInput: NInput,
            NModal: NModal,
            NTabs: NTabs,
            NTabPane: NTabPane,
            NSelect: NSelect,
            NText: NText,
            activeTab: activeTab,
            roles: roles,
            pages: pages,
            loadingRoles: loadingRoles,
            loadingPages: loadingPages,
            showRoleModal: showRoleModal,
            editingRole: editingRole,
            roleForm: roleForm,
            showRolePermModal: showRolePermModal,
            rolePermForm: rolePermForm,
            showPageModal: showPageModal,
            editingPage: editingPage,
            pageForm: pageForm,
            permissionOptions: permissionOptions,
            canAccess: canAccess,
            openAddRoleModal: openAddRoleModal,
            closeRoleModal: closeRoleModal,
            submitRole: submitRole,
            closeRolePermModal: closeRolePermModal,
            submitRolePerms: submitRolePerms,
            openAddPageModal: openAddPageModal,
            closePageModal: closePageModal,
            submitPage: submitPage,
            roleColumns: roleColumns,
            pageColumns: pageColumns,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Settings.vue.js.map