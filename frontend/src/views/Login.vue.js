import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMessage, NLayout, NLayoutContent, NCard, NForm, NFormItem, NInput, NButton } from 'naive-ui';
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5';
const __VLS_props = defineProps();
const __VLS_emit = defineEmits(['toggle-theme']);
// router + auth store + message
const router = useRouter();
const auth = useAuthStore();
const message = useMessage();
// reactive form model
const form = reactive({
    name: '',
    password: ''
});
async function submit() {
    if (!form.name || !form.password) {
        message.warning('Please enter both username and password');
        return;
    }
    try {
        // Pass as single object argument
        await auth.login({
            name: form.name, // Match the expected parameter name
            password: form.password
        });
        router.push('/dashboard');
    }
    catch (err) {
        const msg = err?.response?.data?.error || err.message || 'Login failed';
        message.error(msg);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NLayout;
/** @type {[typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "top-bar" },
});
const __VLS_5 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ 'onClick': {} },
    quaternary: true,
    circle: true,
    size: "large",
    ...{ class: "theme-toggle-btn" },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    quaternary: true,
    circle: true,
    size: "large",
    ...{ class: "theme-toggle-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_9;
let __VLS_10;
let __VLS_11;
const __VLS_12 = {
    onClick: (...[$event]) => {
        __VLS_ctx.$emit('toggle-theme');
    }
};
__VLS_8.slots.default;
const __VLS_13 = {}.NIcon;
/** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    component: (__VLS_ctx.isDark ? __VLS_ctx.SunnyOutline : __VLS_ctx.MoonOutline),
}));
const __VLS_15 = __VLS_14({
    component: (__VLS_ctx.isDark ? __VLS_ctx.SunnyOutline : __VLS_ctx.MoonOutline),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
var __VLS_8;
const __VLS_17 = {}.NLayoutContent;
/** @type {[typeof __VLS_components.NLayoutContent, typeof __VLS_components.nLayoutContent, typeof __VLS_components.NLayoutContent, typeof __VLS_components.nLayoutContent, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    ...{ style: {} },
}));
const __VLS_19 = __VLS_18({
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
__VLS_20.slots.default;
const __VLS_21 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    title: "Login",
    ...{ class: "login-card" },
}));
const __VLS_23 = __VLS_22({
    title: "Login",
    ...{ class: "login-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
const __VLS_25 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({}));
const __VLS_27 = __VLS_26({}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
const __VLS_29 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    label: "Username",
    path: "name",
}));
const __VLS_31 = __VLS_30({
    label: "Username",
    path: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
__VLS_32.slots.default;
const __VLS_33 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    value: (__VLS_ctx.form.name),
    placeholder: "Username",
}));
const __VLS_35 = __VLS_34({
    value: (__VLS_ctx.form.name),
    placeholder: "Username",
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
var __VLS_32;
const __VLS_37 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    label: "Password",
    path: "password",
}));
const __VLS_39 = __VLS_38({
    label: "Password",
    path: "password",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
__VLS_40.slots.default;
const __VLS_41 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    value: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "Password",
}));
const __VLS_43 = __VLS_42({
    value: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "Password",
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
var __VLS_40;
const __VLS_45 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    ...{ 'onClick': {} },
    type: "primary",
    block: true,
}));
const __VLS_47 = __VLS_46({
    ...{ 'onClick': {} },
    type: "primary",
    block: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
let __VLS_49;
let __VLS_50;
let __VLS_51;
const __VLS_52 = {
    onClick: (__VLS_ctx.submit)
};
__VLS_48.slots.default;
var __VLS_48;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
const __VLS_53 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    ...{ 'onClick': {} },
    text: true,
}));
const __VLS_55 = __VLS_54({
    ...{ 'onClick': {} },
    text: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
let __VLS_57;
let __VLS_58;
let __VLS_59;
const __VLS_60 = {
    onClick: (...[$event]) => {
        __VLS_ctx.router.push('/signup');
    }
};
__VLS_56.slots.default;
var __VLS_56;
var __VLS_28;
var __VLS_24;
var __VLS_20;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NLayout: NLayout,
            NLayoutContent: NLayoutContent,
            NCard: NCard,
            NForm: NForm,
            NFormItem: NFormItem,
            NInput: NInput,
            NButton: NButton,
            MoonOutline: MoonOutline,
            SunnyOutline: SunnyOutline,
            router: router,
            form: form,
            submit: submit,
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
//# sourceMappingURL=Login.vue.js.map