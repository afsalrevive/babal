import { useRouter } from 'vue-router';
const router = useRouter();
const goHome = () => router.push('/');
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.NLayout;
/** @type {[typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, typeof __VLS_components.NLayout, typeof __VLS_components.nLayout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
const __VLS_5 = {}.NResult;
/** @type {[typeof __VLS_components.NResult, typeof __VLS_components.nResult, typeof __VLS_components.NResult, typeof __VLS_components.nResult, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    status: "404",
    title: "Page Not Found",
    description: "The page you are looking for doesn't exist or was moved.",
}));
const __VLS_7 = __VLS_6({
    status: "404",
    title: "Page Not Found",
    description: "The page you are looking for doesn't exist or was moved.",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
{
    const { footer: __VLS_thisSlot } = __VLS_8.slots;
    const __VLS_9 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_11 = __VLS_10({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    let __VLS_13;
    let __VLS_14;
    let __VLS_15;
    const __VLS_16 = {
        onClick: (__VLS_ctx.goHome)
    };
    __VLS_12.slots.default;
    var __VLS_12;
}
var __VLS_8;
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            goHome: goHome,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=NotFound.vue.js.map