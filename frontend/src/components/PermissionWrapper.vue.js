import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { LockClosedOutline } from '@vicons/ionicons5';
const props = defineProps({
    resource: {
        type: String,
        required: true
    },
    operation: {
        type: String,
        validator: (v) => ['read', 'write'].includes(v),
        required: true
    },
    showFallback: {
        type: Boolean,
        default: true
    },
    fallbackText: {
        type: String,
        default: ''
    },
    inheritFromParent: {
        type: Boolean,
        default: false
    }
});
const auth = useAuthStore();
const normalizedResource = computed(() => props.resource.toLowerCase());
// Preserve existing logic while adding enhancements
const hasAccess = computed(() => {
    if (auth.isAdmin)
        return true;
    // Explicitly type operation as union type
    const operation = props.operation;
    const resource = normalizedResource.value;
    // Type-safe permission checks
    const exactPermission = `${resource}.${operation}`;
    const hasExact = auth.user?.perms?.includes(exactPermission) ?? false;
    const hasImplied = operation === 'read' &&
        auth.user?.perms?.includes(`${resource}.write`);
    const hasParentAccess = props.inheritFromParent &&
        auth.hasPermission(resource, operation);
    return hasExact || hasImplied || hasParentAccess;
});
// Improved fallback text handling
const computedFallbackText = computed(() => {
    if (props.fallbackText)
        return props.fallbackText;
    return auth.isAdmin
        ? 'Admin access required'
        : `Requires ${normalizedResource.value}.${props.operation}`;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.hasAccess) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    var __VLS_0 = {};
}
else if (__VLS_ctx.showFallback) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    var __VLS_2 = {};
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "permission-fallback" },
    });
    const __VLS_4 = {}.NIcon;
    /** @type {[typeof __VLS_components.NIcon, typeof __VLS_components.nIcon, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        component: (__VLS_ctx.LockClosedOutline),
    }));
    const __VLS_6 = __VLS_5({
        component: (__VLS_ctx.LockClosedOutline),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
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
    (__VLS_ctx.fallbackText);
    var __VLS_11;
}
/** @type {__VLS_StyleScopedClasses['permission-fallback']} */ ;
// @ts-ignore
var __VLS_1 = __VLS_0, __VLS_3 = __VLS_2;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LockClosedOutline: LockClosedOutline,
            hasAccess: hasAccess,
        };
    },
    props: {
        resource: {
            type: String,
            required: true
        },
        operation: {
            type: String,
            validator: (v) => ['read', 'write'].includes(v),
            required: true
        },
        showFallback: {
            type: Boolean,
            default: true
        },
        fallbackText: {
            type: String,
            default: ''
        },
        inheritFromParent: {
            type: Boolean,
            default: false
        }
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    props: {
        resource: {
            type: String,
            required: true
        },
        operation: {
            type: String,
            validator: (v) => ['read', 'write'].includes(v),
            required: true
        },
        showFallback: {
            type: Boolean,
            default: true
        },
        fallbackText: {
            type: String,
            default: ''
        },
        inheritFromParent: {
            type: Boolean,
            default: false
        }
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=PermissionWrapper.vue.js.map