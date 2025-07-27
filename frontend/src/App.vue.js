import { ref, computed } from 'vue';
import { NConfigProvider, darkTheme } from 'naive-ui';
import MainLayout from '@/layouts/MainLayout.vue';
import { useRoute } from 'vue-router';
import Login from '@/views/Login.vue';
import Signup from '@/views/Signup.vue';
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
const route = useRoute();
const isAuthPage = computed(() => ['/login', '/signup'].includes(route.path));
const currentPageComponent = computed(() => route.path === '/signup' ? Signup : Login);
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.NConfigProvider;
/** @type {[typeof __VLS_components.NConfigProvider, typeof __VLS_components.nConfigProvider, typeof __VLS_components.NConfigProvider, typeof __VLS_components.nConfigProvider, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    theme: (__VLS_ctx.currentTheme),
    themeOverrides: (__VLS_ctx.themeOverrides),
}));
const __VLS_2 = __VLS_1({
    theme: (__VLS_ctx.currentTheme),
    themeOverrides: (__VLS_ctx.themeOverrides),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
const __VLS_5 = {}.NMessageProvider;
/** @type {[typeof __VLS_components.NMessageProvider, typeof __VLS_components.nMessageProvider, typeof __VLS_components.NMessageProvider, typeof __VLS_components.nMessageProvider, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({}));
const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
const __VLS_9 = ((__VLS_ctx.isAuthPage ? __VLS_ctx.currentPageComponent : __VLS_ctx.MainLayout));
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ...{ 'onToggleTheme': {} },
    isDark: (__VLS_ctx.isDark),
}));
const __VLS_11 = __VLS_10({
    ...{ 'onToggleTheme': {} },
    isDark: (__VLS_ctx.isDark),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_13;
let __VLS_14;
let __VLS_15;
const __VLS_16 = {
    onToggleTheme: (__VLS_ctx.toggleTheme)
};
var __VLS_12;
var __VLS_8;
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NConfigProvider: NConfigProvider,
            MainLayout: MainLayout,
            isDark: isDark,
            currentTheme: currentTheme,
            toggleTheme: toggleTheme,
            isAuthPage: isAuthPage,
            currentPageComponent: currentPageComponent,
            themeOverrides: themeOverrides,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=App.vue.js.map