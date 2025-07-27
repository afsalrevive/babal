import { ref, onMounted, watch, onBeforeUnmount, h } from 'vue';
import { NSpace, NH1, NCard, NStatistic, NGrid, NGi, NDatePicker, NButton, NSpin, NDataTable, useMessage, } from 'naive-ui';
import * as echarts from 'echarts';
const api = {
    get: async (url, params, config = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        const response = await fetch(fullUrl);
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        if (config.responseType === 'blob') {
            return response;
        }
        return response.json();
    }
};
const message = useMessage();
const balances = ref({ cash: 0, online: 0 });
const metrics = ref({
    totalTicketSales: 0,
    totalAgentCharges: 0,
    profitFromSales: 0,
    otherServiceIncome: 0,
    totalExpenditure: 0,
    netProfit: 0,
    totalAgentDeposit: 0,
    totalCustomerDeposit: 0,
    totalAgentCredit: 0,
    totalCustomerCredit: 0,
});
const dateRange = ref(null);
const salesExpenseChartRef = ref(null);
const particularSalesChartRef = ref(null);
const profitBreakdownChartRef = ref(null);
let salesChartInstance = null;
let particularChartInstance = null;
let profitChartInstance = null;
const loadingBalances = ref(true);
const loadingMetrics = ref(true);
const loadingCharts = ref(true);
const loadingPdf = ref(false);
const loadingCustomerBalances = ref(true);
const loadingAgentBalances = ref(true);
const loadingPartnerBalances = ref(true);
const loadingCustomerPdf = ref(false);
const loadingAgentPdf = ref(false);
const loadingPartnerPdf = ref(false);
const customerBalances = ref([]);
const agentBalances = ref([]);
const partnerBalances = ref([]);
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 2,
    }).format(value);
};
const setDefaultDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    dateRange.value = [startOfMonth.getTime(), endOfToday.getTime()];
};
const defaultDateRange = (() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return [startOfMonth.getTime(), endOfToday.getTime()];
})();
const fetchCompanyBalances = async () => {
    loadingBalances.value = true;
    try {
        const data = await api.get('/api/dashboard/balances');
        balances.value.cash = data.cash_balance || 0;
        balances.value.online = data.online_balance || 0;
    }
    catch (error) {
        message.error('Failed to fetch company balances: ' + error.message);
        console.error('Error fetching company balances:', error);
    }
    finally {
        loadingBalances.value = false;
    }
};
const fetchDashboardData = async () => {
    loadingMetrics.value = true;
    loadingCharts.value = true;
    const startDate = dateRange.value ? new Date(dateRange.value[0]).toISOString().split('T')[0] : '';
    let endDate = '';
    if (dateRange.value) {
        const selectedEndDate = new Date(dateRange.value[1]);
        selectedEndDate.setHours(23, 59, 59, 999); // Set to end of the day
        endDate = selectedEndDate.toISOString().split('T')[0];
    }
    try {
        const data = await api.get('/api/dashboard/metrics', {
            start_date: startDate,
            end_date: endDate,
        });
        metrics.value = {
            totalTicketSales: data.total_ticket_sales || 0,
            totalAgentCharges: data.total_agent_charges || 0,
            profitFromSales: data.profit_from_sales || 0,
            otherServiceIncome: data.other_service_income || 0,
            totalExpenditure: data.total_expenditure || 0,
            netProfit: data.net_profit || 0,
            totalAgentDeposit: data.total_agent_deposit || 0,
            totalCustomerDeposit: data.total_customer_deposit || 0,
            totalAgentCredit: data.total_agent_credit || 0,
            totalCustomerCredit: data.total_customer_credit || 0,
        };
        updateSalesExpenseChart(data.sales_expense_trend || []);
        updateParticularSalesChart(data.sales_by_particular || []);
        updateProfitBreakdownChart(data.profit_by_particular || []);
    }
    catch (error) {
        message.error('Failed to fetch dashboard data: ' + error.message);
        console.error('Error fetching dashboard data:', error);
    }
    finally {
        loadingMetrics.value = false;
        loadingCharts.value = false;
    }
};
const exportFinancialOverviewPdf = async () => {
    loadingPdf.value = true;
    const startDate = dateRange.value ? new Date(dateRange.value[0]).toISOString().split('T')[0] : '';
    const endDate = dateRange.value ? new Date(dateRange.value[1]).toISOString().split('T')[0] : '';
    try {
        const response = await api.get('/api/dashboard/metrics', {
            start_date: startDate,
            end_date: endDate,
            export: 'pdf'
        }, {
            responseType: 'blob'
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'financial_overview.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success('Financial overview exported successfully!');
    }
    catch (error) {
        message.error('Failed to export PDF: ' + error.message);
        console.error('Error exporting PDF:', error);
    }
    finally {
        loadingPdf.value = false;
    }
};
const updateSalesExpenseChart = (trendData) => {
    if (!salesExpenseChartRef.value) {
        console.warn("Sales Expense Chart ref not available yet.");
        return;
    }
    if (!salesChartInstance) {
        salesChartInstance = echarts.init(salesExpenseChartRef.value);
        window.addEventListener('resize', () => salesChartInstance.resize());
    }
    const dates = trendData.map(item => item.date);
    const sales = trendData.map(item => item.sales);
    const expenses = trendData.map(item => item.expenses);
    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                let res = params[0].name + '<br/>';
                params.forEach(function (item) {
                    res += item.marker + item.seriesName + ': ' + formatCurrency(item.value) + '<br/>';
                });
                return res;
            }
        },
        legend: {
            data: ['Sales', 'Expenses']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dates
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value) {
                    return formatCurrency(value);
                }
            }
        },
        series: [
            {
                name: 'Sales',
                type: 'line',
                data: sales,
                smooth: true,
                itemStyle: {
                    color: '#63b3ed'
                }
            },
            {
                name: 'Expenses',
                type: 'line',
                data: expenses,
                smooth: true,
                itemStyle: {
                    color: '#fc8181'
                }
            }
        ]
    };
    salesChartInstance.setOption(option);
};
const updateParticularSalesChart = (particularData) => {
    if (!particularSalesChartRef.value) {
        console.warn("Particular Sales Chart ref not available yet.");
        return;
    }
    if (!particularChartInstance) {
        particularChartInstance = echarts.init(particularSalesChartRef.value);
        window.addEventListener('resize', () => particularChartInstance.resize());
    }
    const names = particularData.map(item => item.name);
    const sales = particularData.map(item => item.sales);
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function (params) {
                let res = params[0].name + '<br/>';
                params.forEach(function (item) {
                    res += item.marker + item.seriesName + ': ' + formatCurrency(item.value) + '<br/>';
                });
                return res;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: {
                rotate: 45,
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value) {
                    return formatCurrency(value);
                }
            }
        },
        series: [
            {
                name: 'Sales',
                type: 'bar',
                data: sales,
                itemStyle: {
                    color: '#48bb78'
                }
            }
        ]
    };
    particularChartInstance.setOption(option);
};
const updateProfitBreakdownChart = (profitData) => {
    if (!profitBreakdownChartRef.value) {
        console.warn("Profit Breakdown Chart ref not available yet.");
        return;
    }
    if (!profitChartInstance) {
        profitChartInstance = echarts.init(profitBreakdownChartRef.value);
        window.addEventListener('resize', () => profitChartInstance.resize());
    }
    const seriesData = profitData.map(item => ({
        value: item.profit,
        name: item.name
    }));
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)',
            valueFormatter: function (value) {
                return formatCurrency(value);
            }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            type: 'scroll',
            top: 'center',
            bottom: 'bottom'
        },
        series: [
            {
                name: 'Profit',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: 'bold',
                        formatter: '{b}\n{d}%'
                    }
                },
                labelLine: {
                    show: false
                },
                data: seriesData
            }
        ]
    };
    profitChartInstance.setOption(option);
};
// --- Fetch Functions for Wallet/Credit Balances ---
const fetchCustomerBalances = async () => {
    loadingCustomerBalances.value = true;
    try {
        const data = await api.get('/api/dashboard/customer_balances');
        customerBalances.value = data;
    }
    catch (error) {
        message.error('Failed to fetch customer balances: ' + error.message);
        console.error('Error fetching customer balances:', error);
    }
    finally {
        loadingCustomerBalances.value = false;
    }
};
const fetchAgentBalances = async () => {
    loadingAgentBalances.value = true;
    try {
        const data = await api.get('/api/dashboard/agent_balances');
        agentBalances.value = data;
    }
    catch (error) {
        message.error('Failed to fetch agent balances: ' + error.message);
        console.error('Error fetching agent balances:', error);
    }
    finally {
        loadingAgentBalances.value = false;
    }
};
const fetchPartnerBalances = async () => {
    loadingPartnerBalances.value = true;
    try {
        const data = await api.get('/api/dashboard/partner_balances');
        partnerBalances.value = data;
    }
    catch (error) {
        message.error('Failed to fetch partner balances: ' + error.message);
        console.error('Error fetching partner balances:', error);
    }
    finally {
        loadingPartnerBalances.value = false;
    }
};
// --- Export Functions for Wallet/Credit Balances ---
const exportCustomerBalancesPdf = async () => {
    loadingCustomerPdf.value = true;
    try {
        const response = await api.get('/api/dashboard/customer_balances', { export: 'pdf' }, { responseType: 'blob' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'customer_balances.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success('Customer balances exported successfully!');
    }
    catch (error) {
        message.error('Failed to export customer balances PDF: ' + error.message);
        console.error('Error exporting customer balances PDF:', error);
    }
    finally {
        loadingCustomerPdf.value = false;
    }
};
const exportAgentBalancesPdf = async () => {
    loadingAgentPdf.value = true;
    try {
        const response = await api.get('/api/dashboard/agent_balances', { export: 'pdf' }, { responseType: 'blob' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'agent_balances.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success('Agent balances exported successfully!');
    }
    catch (error) {
        message.error('Failed to export agent balances PDF: ' + error.message);
        console.error('Error exporting agent balances PDF:', error);
    }
    finally {
        loadingAgentPdf.value = false;
    }
};
const exportPartnerBalancesPdf = async () => {
    loadingPartnerPdf.value = true;
    try {
        const response = await api.get('/api/dashboard/partner_balances', { export: 'pdf' }, { responseType: 'blob' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'partner_balances.pdf';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success('Partner balances exported successfully!');
    }
    catch (error) {
        message.error('Failed to export partner balances PDF: ' + error.message);
        console.error('Error exporting partner balances PDF:', error);
    }
    finally {
        loadingPartnerPdf.value = false;
    }
};
// --- DataTable Columns Definitions ---
const customerColumns = [
    { title: 'ID', key: 'ID', width: 50 },
    { title: 'Name', key: 'Name', width: 150 },
    { title: 'Wallet Balance', key: 'Wallet Balance', width: 120, render: (row) => formatCurrency(row['Wallet Balance']) },
    { title: 'Credit Limit', key: 'Credit Limit', width: 120, render: (row) => formatCurrency(row['Credit Limit']) },
    { title: 'Credit Used', key: 'Credit Used', width: 120, render: (row) => formatCurrency(row['Credit Used']) },
    { title: 'Credit Available', key: 'Credit Available', width: 120, render: (row) => formatCurrency(row['Credit Available']) },
];
const agentColumns = [
    { title: 'ID', key: 'ID', width: 50 },
    { title: 'Name', key: 'Name', width: 150 },
    { title: 'Wallet Balance', key: 'Wallet Balance', width: 120, render: (row) => formatCurrency(row['Wallet Balance']) },
    { title: 'Credit Limit', key: 'Credit Limit', width: 120, render: (row) => formatCurrency(row['Credit Limit']) },
    { title: 'Credit Balance', key: 'Credit Balance', width: 120, render: (row) => formatCurrency(row['Credit Balance']) },
    { title: 'Credit Used', key: 'Credit Used', width: 120, render: (row) => formatCurrency(row['Credit Used']) },
];
const partnerColumns = [
    { title: 'ID', key: 'ID', width: 50 },
    { title: 'Name', key: 'Name', width: 150 },
    { title: 'Wallet Balance', key: 'Wallet Balance', width: 120, render: (row) => formatCurrency(row['Wallet Balance']) },
    { title: 'Allow Negative Wallet', key: 'Allow Negative Wallet', width: 150 },
];
onMounted(() => {
    setDefaultDateRange();
    fetchCompanyBalances();
    fetchCustomerBalances();
    fetchAgentBalances();
    fetchPartnerBalances();
});
onBeforeUnmount(() => {
    if (salesChartInstance) {
        salesChartInstance.dispose();
        salesChartInstance = null;
    }
    if (particularChartInstance) {
        particularChartInstance.dispose();
        particularChartInstance = null;
    }
    if (profitChartInstance) {
        profitChartInstance.dispose();
        profitChartInstance = null;
    }
});
watch(dateRange, () => {
    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
        fetchDashboardData();
    }
}, { immediate: true });
const defaultDateRangeValue = defaultDateRange;
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    vertical: true,
    size: (24),
    ...{ class: "p-6 bg-gray-50 min-h-screen rounded-lg shadow-inner" },
}));
const __VLS_2 = __VLS_1({
    vertical: true,
    size: (24),
    ...{ class: "p-6 bg-gray-50 min-h-screen rounded-lg shadow-inner" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
const __VLS_5 = {}.NH1;
/** @type {[typeof __VLS_components.NH1, typeof __VLS_components.nH1, typeof __VLS_components.NH1, typeof __VLS_components.nH1, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ class: "text-4xl font-extrabold text-gray-900 border-b-2 pb-4 mb-6 border-blue-500" },
}));
const __VLS_7 = __VLS_6({
    ...{ class: "text-4xl font-extrabold text-gray-900 border-b-2 pb-4 mb-6 border-blue-500" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
var __VLS_8;
const __VLS_9 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    title: "Current Company Account Balance",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}));
const __VLS_11 = __VLS_10({
    title: "Current Company Account Balance",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
__VLS_12.slots.default;
const __VLS_13 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    show: (__VLS_ctx.loadingBalances),
    size: "large",
}));
const __VLS_15 = __VLS_14({
    show: (__VLS_ctx.loadingBalances),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
__VLS_16.slots.default;
const __VLS_17 = {}.NGrid;
/** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    xGap: "24",
    yGap: "24",
    cols: (2),
    sm: (2),
}));
const __VLS_19 = __VLS_18({
    xGap: "24",
    yGap: "24",
    cols: (2),
    sm: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
__VLS_20.slots.default;
const __VLS_21 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({}));
const __VLS_23 = __VLS_22({}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
const __VLS_25 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    label: "Cash Balance",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.balances.cash)),
    ...{ class: "text-green-700 font-semibold" },
}));
const __VLS_27 = __VLS_26({
    label: "Cash Balance",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.balances.cash)),
    ...{ class: "text-green-700 font-semibold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_28.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xl" },
    });
}
var __VLS_28;
var __VLS_24;
const __VLS_29 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({}));
const __VLS_31 = __VLS_30({}, ...__VLS_functionalComponentArgsRest(__VLS_30));
__VLS_32.slots.default;
const __VLS_33 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    label: "Online Balance",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.balances.online)),
    ...{ class: "text-blue-700 font-semibold" },
}));
const __VLS_35 = __VLS_34({
    label: "Online Balance",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.balances.online)),
    ...{ class: "text-blue-700 font-semibold" },
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
__VLS_36.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_36.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xl" },
    });
}
var __VLS_36;
var __VLS_32;
var __VLS_20;
var __VLS_16;
var __VLS_12;
const __VLS_37 = {}.NGrid;
/** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    xGap: "24",
    yGap: "24",
    cols: (1),
    md: (2),
}));
const __VLS_39 = __VLS_38({
    xGap: "24",
    yGap: "24",
    cols: (1),
    md: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
__VLS_40.slots.default;
const __VLS_41 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({}));
const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
__VLS_44.slots.default;
const __VLS_45 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    title: "Financial Overview",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200 h-full" },
    hoverable: true,
}));
const __VLS_47 = __VLS_46({
    title: "Financial Overview",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200 h-full" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
__VLS_48.slots.default;
const __VLS_49 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    vertical: true,
    size: (20),
}));
const __VLS_51 = __VLS_50({
    vertical: true,
    size: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
__VLS_52.slots.default;
const __VLS_53 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    ...{ class: "table-controls" },
    justify: "start",
    align: "center",
}));
const __VLS_55 = __VLS_54({
    ...{ class: "table-controls" },
    justify: "start",
    align: "center",
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
__VLS_56.slots.default;
const __VLS_57 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    ...{ 'onUpdate:value': {} },
    ...{ class: "date-filter flex-grow" },
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    defaultValue: (__VLS_ctx.defaultDateRange),
}));
const __VLS_59 = __VLS_58({
    ...{ 'onUpdate:value': {} },
    ...{ class: "date-filter flex-grow" },
    value: (__VLS_ctx.dateRange),
    type: "daterange",
    defaultValue: (__VLS_ctx.defaultDateRange),
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
let __VLS_61;
let __VLS_62;
let __VLS_63;
const __VLS_64 = {
    'onUpdate:value': (__VLS_ctx.fetchDashboardData)
};
var __VLS_60;
const __VLS_65 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingPdf),
}));
const __VLS_67 = __VLS_66({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingPdf),
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
let __VLS_69;
let __VLS_70;
let __VLS_71;
const __VLS_72 = {
    onClick: (__VLS_ctx.exportFinancialOverviewPdf)
};
__VLS_68.slots.default;
var __VLS_68;
var __VLS_56;
const __VLS_73 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    show: (__VLS_ctx.loadingMetrics),
    size: "large",
}));
const __VLS_75 = __VLS_74({
    show: (__VLS_ctx.loadingMetrics),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
__VLS_76.slots.default;
const __VLS_77 = {}.NGrid;
/** @type {[typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, typeof __VLS_components.NGrid, typeof __VLS_components.nGrid, ]} */ ;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
    xGap: "16",
    yGap: "16",
    cols: (3),
    sm: (3),
    md: (4),
    ...{ class: "mt-4" },
}));
const __VLS_79 = __VLS_78({
    xGap: "16",
    yGap: "16",
    cols: (3),
    sm: (3),
    md: (4),
    ...{ class: "mt-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
__VLS_80.slots.default;
const __VLS_81 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({}));
const __VLS_83 = __VLS_82({}, ...__VLS_functionalComponentArgsRest(__VLS_82));
__VLS_84.slots.default;
const __VLS_85 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
    label: "Total Ticket Sales",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalTicketSales)),
    ...{ class: "text-purple-700 text-sm" },
}));
const __VLS_87 = __VLS_86({
    label: "Total Ticket Sales",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalTicketSales)),
    ...{ class: "text-purple-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
var __VLS_84;
const __VLS_89 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({}));
const __VLS_91 = __VLS_90({}, ...__VLS_functionalComponentArgsRest(__VLS_90));
__VLS_92.slots.default;
const __VLS_93 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
    label: "Total Agent Charges",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalAgentCharges)),
    ...{ class: "text-orange-700 text-sm" },
}));
const __VLS_95 = __VLS_94({
    label: "Total Agent Charges",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalAgentCharges)),
    ...{ class: "text-orange-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
var __VLS_92;
const __VLS_97 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({}));
const __VLS_99 = __VLS_98({}, ...__VLS_functionalComponentArgsRest(__VLS_98));
__VLS_100.slots.default;
const __VLS_101 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
    label: "Profit from Sales",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.profitFromSales)),
    ...{ class: "text-green-700 text-sm" },
}));
const __VLS_103 = __VLS_102({
    label: "Profit from Sales",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.profitFromSales)),
    ...{ class: "text-green-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
var __VLS_100;
const __VLS_105 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({}));
const __VLS_107 = __VLS_106({}, ...__VLS_functionalComponentArgsRest(__VLS_106));
__VLS_108.slots.default;
const __VLS_109 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
    label: "Other Service Income",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.otherServiceIncome)),
    ...{ class: "text-teal-700 text-sm" },
}));
const __VLS_111 = __VLS_110({
    label: "Other Service Income",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.otherServiceIncome)),
    ...{ class: "text-teal-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
var __VLS_108;
const __VLS_113 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({}));
const __VLS_115 = __VLS_114({}, ...__VLS_functionalComponentArgsRest(__VLS_114));
__VLS_116.slots.default;
const __VLS_117 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    label: "Total Expenditure",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalExpenditure)),
    ...{ class: "text-red-700 text-sm" },
}));
const __VLS_119 = __VLS_118({
    label: "Total Expenditure",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalExpenditure)),
    ...{ class: "text-red-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
var __VLS_116;
const __VLS_121 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({}));
const __VLS_123 = __VLS_122({}, ...__VLS_functionalComponentArgsRest(__VLS_122));
__VLS_124.slots.default;
const __VLS_125 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    label: "Net Profit",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.netProfit)),
    valueStyle: ({ color: __VLS_ctx.metrics.netProfit >= 0 ? 'green' : 'red' }),
    ...{ class: "font-bold text-sm" },
}));
const __VLS_127 = __VLS_126({
    label: "Net Profit",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.netProfit)),
    valueStyle: ({ color: __VLS_ctx.metrics.netProfit >= 0 ? 'green' : 'red' }),
    ...{ class: "font-bold text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
var __VLS_124;
const __VLS_129 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_130 = __VLS_asFunctionalComponent(__VLS_129, new __VLS_129({}));
const __VLS_131 = __VLS_130({}, ...__VLS_functionalComponentArgsRest(__VLS_130));
__VLS_132.slots.default;
const __VLS_133 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_134 = __VLS_asFunctionalComponent(__VLS_133, new __VLS_133({
    label: "Total Agent Deposits",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalAgentDeposit)),
    ...{ class: "text-indigo-700 text-sm" },
}));
const __VLS_135 = __VLS_134({
    label: "Total Agent Deposits",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalAgentDeposit)),
    ...{ class: "text-indigo-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_134));
var __VLS_132;
const __VLS_137 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({}));
const __VLS_139 = __VLS_138({}, ...__VLS_functionalComponentArgsRest(__VLS_138));
__VLS_140.slots.default;
const __VLS_141 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent(__VLS_141, new __VLS_141({
    label: "Total Customer Deposits",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalCustomerDeposit)),
    ...{ class: "text-pink-700 text-sm" },
}));
const __VLS_143 = __VLS_142({
    label: "Total Customer Deposits",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalCustomerDeposit)),
    ...{ class: "text-pink-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_142));
var __VLS_140;
const __VLS_145 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent(__VLS_145, new __VLS_145({}));
const __VLS_147 = __VLS_146({}, ...__VLS_functionalComponentArgsRest(__VLS_146));
__VLS_148.slots.default;
const __VLS_149 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
    label: "Total Agent Credit",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalAgentCredit)),
    ...{ class: "text-yellow-700 text-sm" },
}));
const __VLS_151 = __VLS_150({
    label: "Total Agent Credit",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalAgentCredit)),
    ...{ class: "text-yellow-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_150));
var __VLS_148;
const __VLS_153 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({}));
const __VLS_155 = __VLS_154({}, ...__VLS_functionalComponentArgsRest(__VLS_154));
__VLS_156.slots.default;
const __VLS_157 = {}.NStatistic;
/** @type {[typeof __VLS_components.NStatistic, typeof __VLS_components.nStatistic, ]} */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    label: "Total Customer Credit",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalCustomerCredit)),
    ...{ class: "text-cyan-700 text-sm" },
}));
const __VLS_159 = __VLS_158({
    label: "Total Customer Credit",
    value: (__VLS_ctx.formatCurrency(__VLS_ctx.metrics.totalCustomerCredit)),
    ...{ class: "text-cyan-700 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
var __VLS_156;
var __VLS_80;
var __VLS_76;
var __VLS_52;
var __VLS_48;
var __VLS_44;
const __VLS_161 = {}.NGi;
/** @type {[typeof __VLS_components.NGi, typeof __VLS_components.nGi, typeof __VLS_components.NGi, typeof __VLS_components.nGi, ]} */ ;
// @ts-ignore
const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({}));
const __VLS_163 = __VLS_162({}, ...__VLS_functionalComponentArgsRest(__VLS_162));
__VLS_164.slots.default;
const __VLS_165 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
    title: "Profit Breakdown by Service",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200 h-full" },
    hoverable: true,
}));
const __VLS_167 = __VLS_166({
    title: "Profit Breakdown by Service",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200 h-full" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_166));
__VLS_168.slots.default;
const __VLS_169 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
    show: (__VLS_ctx.loadingCharts),
    size: "large",
}));
const __VLS_171 = __VLS_170({
    show: (__VLS_ctx.loadingCharts),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
__VLS_172.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "profitBreakdownChartRef",
    ...{ class: "echarts-container" },
});
/** @type {typeof __VLS_ctx.profitBreakdownChartRef} */ ;
var __VLS_172;
var __VLS_168;
var __VLS_164;
var __VLS_40;
const __VLS_173 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
    title: "Customer Wallet & Credit Balances",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}));
const __VLS_175 = __VLS_174({
    title: "Customer Wallet & Credit Balances",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_174));
__VLS_176.slots.default;
const __VLS_177 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
    justify: "end",
    ...{ class: "mb-4" },
}));
const __VLS_179 = __VLS_178({
    justify: "end",
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
__VLS_180.slots.default;
const __VLS_181 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingCustomerPdf),
}));
const __VLS_183 = __VLS_182({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingCustomerPdf),
}, ...__VLS_functionalComponentArgsRest(__VLS_182));
let __VLS_185;
let __VLS_186;
let __VLS_187;
const __VLS_188 = {
    onClick: (__VLS_ctx.exportCustomerBalancesPdf)
};
__VLS_184.slots.default;
var __VLS_184;
var __VLS_180;
const __VLS_189 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({
    show: (__VLS_ctx.loadingCustomerBalances),
    size: "large",
}));
const __VLS_191 = __VLS_190({
    show: (__VLS_ctx.loadingCustomerBalances),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_190));
__VLS_192.slots.default;
const __VLS_193 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
    columns: (__VLS_ctx.customerColumns),
    data: (__VLS_ctx.customerBalances),
    bordered: (false),
    singleLine: (false),
    size: "small",
}));
const __VLS_195 = __VLS_194({
    columns: (__VLS_ctx.customerColumns),
    data: (__VLS_ctx.customerBalances),
    bordered: (false),
    singleLine: (false),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_194));
var __VLS_192;
var __VLS_176;
const __VLS_197 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    title: "Agent Wallet & Credit Balances",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}));
const __VLS_199 = __VLS_198({
    title: "Agent Wallet & Credit Balances",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
__VLS_200.slots.default;
const __VLS_201 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
    justify: "end",
    ...{ class: "mb-4" },
}));
const __VLS_203 = __VLS_202({
    justify: "end",
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
__VLS_204.slots.default;
const __VLS_205 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingAgentPdf),
}));
const __VLS_207 = __VLS_206({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingAgentPdf),
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
let __VLS_209;
let __VLS_210;
let __VLS_211;
const __VLS_212 = {
    onClick: (__VLS_ctx.exportAgentBalancesPdf)
};
__VLS_208.slots.default;
var __VLS_208;
var __VLS_204;
const __VLS_213 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
    show: (__VLS_ctx.loadingAgentBalances),
    size: "large",
}));
const __VLS_215 = __VLS_214({
    show: (__VLS_ctx.loadingAgentBalances),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
__VLS_216.slots.default;
const __VLS_217 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    columns: (__VLS_ctx.agentColumns),
    data: (__VLS_ctx.agentBalances),
    bordered: (false),
    singleLine: (false),
    size: "small",
}));
const __VLS_219 = __VLS_218({
    columns: (__VLS_ctx.agentColumns),
    data: (__VLS_ctx.agentBalances),
    bordered: (false),
    singleLine: (false),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
var __VLS_216;
var __VLS_200;
const __VLS_221 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    title: "Partner Wallet Balances",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}));
const __VLS_223 = __VLS_222({
    title: "Partner Wallet Balances",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
__VLS_224.slots.default;
const __VLS_225 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    justify: "end",
    ...{ class: "mb-4" },
}));
const __VLS_227 = __VLS_226({
    justify: "end",
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
__VLS_228.slots.default;
const __VLS_229 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingPartnerPdf),
}));
const __VLS_231 = __VLS_230({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingPartnerPdf),
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
let __VLS_233;
let __VLS_234;
let __VLS_235;
const __VLS_236 = {
    onClick: (__VLS_ctx.exportPartnerBalancesPdf)
};
__VLS_232.slots.default;
var __VLS_232;
var __VLS_228;
const __VLS_237 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    show: (__VLS_ctx.loadingPartnerBalances),
    size: "large",
}));
const __VLS_239 = __VLS_238({
    show: (__VLS_ctx.loadingPartnerBalances),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
__VLS_240.slots.default;
const __VLS_241 = {}.NDataTable;
/** @type {[typeof __VLS_components.NDataTable, typeof __VLS_components.nDataTable, ]} */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    columns: (__VLS_ctx.partnerColumns),
    data: (__VLS_ctx.partnerBalances),
    bordered: (false),
    singleLine: (false),
    size: "small",
}));
const __VLS_243 = __VLS_242({
    columns: (__VLS_ctx.partnerColumns),
    data: (__VLS_ctx.partnerBalances),
    bordered: (false),
    singleLine: (false),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
var __VLS_240;
var __VLS_224;
const __VLS_245 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    title: "Sales and Expense Trend",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}));
const __VLS_247 = __VLS_246({
    title: "Sales and Expense Trend",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
__VLS_248.slots.default;
const __VLS_249 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    show: (__VLS_ctx.loadingCharts),
    size: "large",
}));
const __VLS_251 = __VLS_250({
    show: (__VLS_ctx.loadingCharts),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
__VLS_252.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "salesExpenseChartRef",
    ...{ class: "echarts-container" },
});
/** @type {typeof __VLS_ctx.salesExpenseChartRef} */ ;
var __VLS_252;
var __VLS_248;
const __VLS_253 = {}.NCard;
/** @type {[typeof __VLS_components.NCard, typeof __VLS_components.nCard, typeof __VLS_components.NCard, typeof __VLS_components.nCard, ]} */ ;
// @ts-ignore
const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
    title: "Sales by Service/Particular",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}));
const __VLS_255 = __VLS_254({
    title: "Sales by Service/Particular",
    segmented: ({ content: true }),
    ...{ class: "shadow-xl rounded-xl border border-gray-200" },
    hoverable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_254));
__VLS_256.slots.default;
const __VLS_257 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    show: (__VLS_ctx.loadingCharts),
    size: "large",
}));
const __VLS_259 = __VLS_258({
    show: (__VLS_ctx.loadingCharts),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
__VLS_260.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "particularSalesChartRef",
    ...{ class: "echarts-container" },
});
/** @type {typeof __VLS_ctx.particularSalesChartRef} */ ;
var __VLS_260;
var __VLS_256;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gray-50']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-extrabold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-700']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['date-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-purple-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-orange-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-teal-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-indigo-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-pink-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-yellow-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-cyan-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['echarts-container']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['echarts-container']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['echarts-container']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NSpace: NSpace,
            NH1: NH1,
            NCard: NCard,
            NStatistic: NStatistic,
            NGrid: NGrid,
            NGi: NGi,
            NDatePicker: NDatePicker,
            NButton: NButton,
            NSpin: NSpin,
            NDataTable: NDataTable,
            balances: balances,
            metrics: metrics,
            dateRange: dateRange,
            salesExpenseChartRef: salesExpenseChartRef,
            particularSalesChartRef: particularSalesChartRef,
            profitBreakdownChartRef: profitBreakdownChartRef,
            loadingBalances: loadingBalances,
            loadingMetrics: loadingMetrics,
            loadingCharts: loadingCharts,
            loadingPdf: loadingPdf,
            loadingCustomerBalances: loadingCustomerBalances,
            loadingAgentBalances: loadingAgentBalances,
            loadingPartnerBalances: loadingPartnerBalances,
            loadingCustomerPdf: loadingCustomerPdf,
            loadingAgentPdf: loadingAgentPdf,
            loadingPartnerPdf: loadingPartnerPdf,
            customerBalances: customerBalances,
            agentBalances: agentBalances,
            partnerBalances: partnerBalances,
            formatCurrency: formatCurrency,
            defaultDateRange: defaultDateRange,
            fetchDashboardData: fetchDashboardData,
            exportFinancialOverviewPdf: exportFinancialOverviewPdf,
            exportCustomerBalancesPdf: exportCustomerBalancesPdf,
            exportAgentBalancesPdf: exportAgentBalancesPdf,
            exportPartnerBalancesPdf: exportPartnerBalancesPdf,
            customerColumns: customerColumns,
            agentColumns: agentColumns,
            partnerColumns: partnerColumns,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Dashboard.vue.js.map