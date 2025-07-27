import { Line as LineChart, Bar as BarChart } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement } from 'chart.js';
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement);
export default (await import('vue')).defineComponent({
    name: 'ReportsView',
    components: { LineChart, BarChart },
    data() {
        return {
            usersData: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Monthly Users',
                        backgroundColor: '#f87979',
                        data: [40, 39, 10, 40, 39, 80]
                    }
                ]
            },
            salesData: {
                labels: ['Product A', 'Product B', 'Product C', 'Product D'],
                datasets: [
                    {
                        label: 'Sales',
                        backgroundColor: ['#41B883', '#E46651', '#00D8FF', '#DD1B16'],
                        data: [40, 20, 12, 25]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        };
    },
    mounted() {
        // You could fetch actual data here
    }
});
const __VLS_ctx = {};
const __VLS_componentsOption = { LineChart, BarChart };
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reports-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "charts-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-wrapper" },
});
const __VLS_0 = {}.LineChart;
/** @type {[typeof __VLS_components.LineChart, typeof __VLS_components.lineChart, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    chartData: (__VLS_ctx.usersData),
    options: (__VLS_ctx.options),
}));
const __VLS_2 = __VLS_1({
    chartData: (__VLS_ctx.usersData),
    options: (__VLS_ctx.options),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-wrapper" },
});
const __VLS_4 = {}.BarChart;
/** @type {[typeof __VLS_components.BarChart, typeof __VLS_components.barChart, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    chartData: (__VLS_ctx.salesData),
    options: (__VLS_ctx.options),
}));
const __VLS_6 = __VLS_5({
    chartData: (__VLS_ctx.salesData),
    options: (__VLS_ctx.options),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {__VLS_StyleScopedClasses['reports-container']} */ ;
/** @type {__VLS_StyleScopedClasses['charts-container']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-wrapper']} */ ;
var __VLS_dollars;
let __VLS_self;
//# sourceMappingURL=Reports.vue.js.map