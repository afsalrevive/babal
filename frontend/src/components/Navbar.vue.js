import { ref, computed, watch, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { NMenu, NButton, NIcon } from 'naive-ui';
import { ChevronForward, ChevronBack } from '@vicons/ionicons5';
import { getIcon } from '@/utils/permissions';
const props = defineProps();
const emit = defineEmits(['toggle']);
const handleToggle = () => {
    emit('toggle');
};
const collapsed = ref(props.collapsed);
watch(() => props.collapsed, (val) => (collapsed.value = val));
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const activeMenu = ref(route.name?.toString() || '');
watch(() => route.name, name => {
    activeMenu.value = name?.toString() || '';
});
const toggleCollapse = () => {
    emit('toggle', !collapsed.value);
};
const handleMenuSelect = (key) => {
    if (key === 'EntityManager') {
        router.push({ name: 'EntityManager', params: { entity: 'customer' } }); // 👈 default entity
    }
    else {
        router.push({ name: key });
    }
};
const goHome = () => router.push('/dashboard');
const menuOptions = computed(() => {
    return router.getRoutes()
        .filter(route => {
        const meta = route.meta;
        return !meta.public &&
            meta.showInNav !== false &&
            meta.resource &&
            auth.hasPermission(meta.resource, meta.operation || 'read');
    })
        .sort((a, b) => (a.meta?.navOrder || 100) - (b.meta?.navOrder || 100))
        .map(route => {
        const meta = route.meta;
        return {
            label: meta.title || route.name?.toString() || '',
            key: route.name?.toString() || '',
            icon: () => h(NIcon, null, {
                default: () => h(getIcon(meta.resource))
            })
        };
    });
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['navbar-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "navbar-wrapper" },
    ...{ class: ({ collapsed: __VLS_ctx.collapsed }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.goHome) },
    ...{ class: "logo" },
});
const __VLS_0 = {}.transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    name: "fade",
    mode: "out-in",
}));
const __VLS_2 = __VLS_1({
    name: "fade",
    mode: "out-in",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (!__VLS_ctx.collapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: "@/assets/logo-full.png",
        ...{ class: "logo-img" },
        alt: "Logo",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: "@/assets/logo-icon.png",
        ...{ class: "logo-icon" },
        alt: "Logo",
    });
}
var __VLS_3;
const __VLS_4 = {}.NMenu;
/** @type {[typeof __VLS_components.NMenu, typeof __VLS_components.nMenu, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onUpdate:value': {} },
    collapsed: (__VLS_ctx.collapsed),
    collapsedWidth: (64),
    collapsedIconSize: (22),
    options: (__VLS_ctx.menuOptions),
    value: (__VLS_ctx.activeMenu),
    accordion: true,
    ...{ class: "nav-menu" },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onUpdate:value': {} },
    collapsed: (__VLS_ctx.collapsed),
    collapsedWidth: (64),
    collapsedIconSize: (22),
    options: (__VLS_ctx.menuOptions),
    value: (__VLS_ctx.activeMenu),
    accordion: true,
    ...{ class: "nav-menu" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    'onUpdate:value': (__VLS_ctx.handleMenuSelect)
};
var __VLS_7;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "desktop-toggle" },
});
const __VLS_12 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onClick': {} },
    circle: true,
    size: "small",
}));
const __VLS_14 = __VLS_13({
    ...{ 'onClick': {} },
    circle: true,
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onClick: (__VLS_ctx.handleToggle)
};
__VLS_15.slots.default;
const __VLS_20 = {}.NIcon;
/** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    component: (__VLS_ctx.collapsed ? __VLS_ctx.ChevronForward : __VLS_ctx.ChevronBack),
}));
const __VLS_22 = __VLS_21({
    component: (__VLS_ctx.collapsed ? __VLS_ctx.ChevronForward : __VLS_ctx.ChevronBack),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_15;
/** @type {__VLS_StyleScopedClasses['navbar-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['logo']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-img']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-toggle']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NMenu: NMenu,
            NButton: NButton,
            NIcon: NIcon,
            ChevronForward: ChevronForward,
            ChevronBack: ChevronBack,
            handleToggle: handleToggle,
            collapsed: collapsed,
            activeMenu: activeMenu,
            handleMenuSelect: handleMenuSelect,
            goHome: goHome,
            menuOptions: menuOptions,
        };
    },
    emits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Navbar.vue.js.map