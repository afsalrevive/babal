import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const showDebug = import.meta.env.DEV;
const perms = computed(() => auth.perms);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.showDebug) {
    const __VLS_0 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        title: "Effective Permissions",
        type: "info",
    }));
    const __VLS_2 = __VLS_1({
        title: "Effective Permissions",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    var __VLS_4 = {};
    __VLS_3.slots.default;
    for (const [p] of __VLS_getVForSourceType((__VLS_ctx.perms))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (p),
        });
        (p);
    }
    var __VLS_3;
}
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            showDebug: showDebug,
            perms: perms,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=PermissionDebug.vue.js.map