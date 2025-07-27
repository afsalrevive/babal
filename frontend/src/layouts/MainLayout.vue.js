import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { NLayout, NLayoutSider, NLayoutContent, NLayoutHeader, NButton, NIcon, NAvatar, NDropdown } from 'naive-ui';
import { MenuOutline, SunnyOutline, MoonOutline } from '@vicons/ionicons5'; // Add theme icons
import Navbar from '@/components/Navbar.vue';
const auth = useAuthStore();
const router = useRouter();
const collapsed = ref(false);
const showHamburger = ref(false);
// Add props and emits
const __VLS_props = defineProps({
    isDark: Boolean
});
const __VLS_emit = defineEmits(['toggle-theme']);
const initials = computed(() => {
    return auth.user?.full_name?.split(' ').map(s => s[0]).join('') || '';
});
const userName = computed(() => auth.user?.full_name ? auth.user.full_name.charAt(0).toUpperCase() + auth.user.full_name.slice(1) : '');
const profileOptions = [
    { label: 'Profile', key: 'profile' },
    { label: 'Logout', key: 'logout' }
];
const handleProfileAction = (key) => {
    if (key === 'logout') {
        auth.logout();
        router.push('/login');
    }
    else if (key === 'profile') {
        router.push('/profile');
    }
};
const handleResize = () => {
    const isMobile = window.innerWidth < 768;
    showHamburger.value = isMobile;
    if (isMobile)
        collapsed.value = true;
    else
        collapsed.value = false;
};
onMounted(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
});
const toggleCollapse = () => {
    collapsed.value = !collapsed.value;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NLayout;
/** @type {[typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    hasSider: true,
}));
const __VLS_2 = __VLS_1({
    hasSider: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
if (__VLS_ctx.auth.isLoggedIn) {
    const __VLS_5 = {}.NLayoutSider;
    /** @type {[typeof __VLS_components.NLayoutSider, typeof __VLS_components.nLayoutSider, typeof __VLS_components.NLayoutSider, typeof __VLS_components.nLayoutSider, ]} */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
        ...{ 'onUpdate:collapsed': {} },
        collapsed: (__VLS_ctx.collapsed),
        collapseMode: "width",
        width: (220),
        collapsedWidth: (64),
        bordered: true,
        showTrigger: "bar",
        nativeScrollbar: (false),
        ...{ style: ({ backgroundColor: __VLS_ctx.isDark ? 'var(--card-bg)' : 'var(--header-bg)' }) },
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onUpdate:collapsed': {} },
        collapsed: (__VLS_ctx.collapsed),
        collapseMode: "width",
        width: (220),
        collapsedWidth: (64),
        bordered: true,
        showTrigger: "bar",
        nativeScrollbar: (false),
        ...{ style: ({ backgroundColor: __VLS_ctx.isDark ? 'var(--card-bg)' : 'var(--header-bg)' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_9;
    let __VLS_10;
    let __VLS_11;
    const __VLS_12 = {
        'onUpdate:collapsed': (...[$event]) => {
            if (!(__VLS_ctx.auth.isLoggedIn))
                return;
            __VLS_ctx.collapsed = $event;
        }
    };
    __VLS_8.slots.default;
    /** @type {[typeof Navbar, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(Navbar, new Navbar({
        ...{ 'onToggle': {} },
        collapsed: (__VLS_ctx.collapsed),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onToggle': {} },
        collapsed: (__VLS_ctx.collapsed),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onToggle: (__VLS_ctx.toggleCollapse)
    };
    var __VLS_15;
    var __VLS_8;
}
const __VLS_20 = {}.NLayout;
/** @type {[typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
if (__VLS_ctx.auth.isLoggedIn) {
    const __VLS_24 = {}.NLayoutHeader;
    /** @type {[typeof __VLS_components.NLayoutHeader, typeof __VLS_components.nLayoutHeader, typeof __VLS_components.NLayoutHeader, typeof __VLS_components.nLayoutHeader, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        bordered: true,
        ...{ class: "header" },
    }));
    const __VLS_26 = __VLS_25({
        bordered: true,
        ...{ class: "header" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "header-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "left" },
    });
    if (__VLS_ctx.showHamburger) {
        const __VLS_28 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            ...{ 'onClick': {} },
            quaternary: true,
            size: "large",
            circle: true,
        }));
        const __VLS_30 = __VLS_29({
            ...{ 'onClick': {} },
            quaternary: true,
            size: "large",
            circle: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        let __VLS_32;
        let __VLS_33;
        let __VLS_34;
        const __VLS_35 = {
            onClick: (__VLS_ctx.toggleCollapse)
        };
        __VLS_31.slots.default;
        const __VLS_36 = {}.NIcon;
        /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            component: (__VLS_ctx.MenuOutline),
        }));
        const __VLS_38 = __VLS_37({
            component: (__VLS_ctx.MenuOutline),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        var __VLS_31;
    }
    const __VLS_40 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        quaternary: true,
        circle: true,
        size: "large",
        ...{ class: "theme-toggle-btn" },
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        quaternary: true,
        circle: true,
        size: "large",
        ...{ class: "theme-toggle-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.auth.isLoggedIn))
                return;
            __VLS_ctx.$emit('toggle-theme');
        }
    };
    __VLS_43.slots.default;
    if (__VLS_ctx.isDark) {
        const __VLS_48 = {}.NIcon;
        /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            component: (__VLS_ctx.SunnyOutline),
        }));
        const __VLS_50 = __VLS_49({
            component: (__VLS_ctx.SunnyOutline),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    }
    else {
        const __VLS_52 = {}.NIcon;
        /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            component: (__VLS_ctx.MoonOutline),
        }));
        const __VLS_54 = __VLS_53({
            component: (__VLS_ctx.MoonOutline),
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    }
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "right" },
    });
    const __VLS_56 = {}.NDropdown;
    /** @type {[typeof __VLS_components.NDropdown, typeof __VLS_components.nDropdown, typeof __VLS_components.NDropdown, typeof __VLS_components.nDropdown, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onSelect': {} },
        trigger: "click",
        options: (__VLS_ctx.profileOptions),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onSelect': {} },
        trigger: "click",
        options: (__VLS_ctx.profileOptions),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onSelect: (__VLS_ctx.handleProfileAction)
    };
    __VLS_59.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-info clickable" },
    });
    const __VLS_64 = {}.NAvatar;
    /** @type {[typeof __VLS_components.NAvatar, typeof __VLS_components.nAvatar, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        size: (40),
        text: (__VLS_ctx.initials),
        round: true,
    }));
    const __VLS_66 = __VLS_65({
        size: (40),
        text: (__VLS_ctx.initials),
        round: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "username" },
    });
    (__VLS_ctx.userName);
    var __VLS_59;
    var __VLS_27;
}
const __VLS_68 = {}.NLayoutContent;
/** @type {[typeof __VLS_components.NLayoutContent, typeof __VLS_components.nLayoutContent, typeof __VLS_components.NLayoutContent, typeof __VLS_components.nLayoutContent, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    ...{ class: "content" },
}));
const __VLS_70 = __VLS_69({
    ...{ class: "content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
var __VLS_71;
var __VLS_23;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-content']} */ ;
/** @type {__VLS_StyleScopedClasses['left']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['right']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-info']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['username']} */ ;
/** @type {__VLS_StyleScopedClasses['content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NLayout: NLayout,
            NLayoutSider: NLayoutSider,
            NLayoutContent: NLayoutContent,
            NLayoutHeader: NLayoutHeader,
            NButton: NButton,
            NIcon: NIcon,
            NAvatar: NAvatar,
            NDropdown: NDropdown,
            MenuOutline: MenuOutline,
            SunnyOutline: SunnyOutline,
            MoonOutline: MoonOutline,
            Navbar: Navbar,
            auth: auth,
            collapsed: collapsed,
            showHamburger: showHamburger,
            initials: initials,
            userName: userName,
            profileOptions: profileOptions,
            handleProfileAction: handleProfileAction,
            toggleCollapse: toggleCollapse,
        };
    },
    emits: {},
    props: {
        isDark: Boolean
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    emits: {},
    props: {
        isDark: Boolean
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=MainLayout.vue.js.map