<template>
  <n-space vertical :size="24" class="p-6 bg-gray-50 min-h-screen rounded-lg shadow-inner">
    <n-h1 class="text-4xl font-extrabold text-gray-900 border-b-2 pb-4 mb-6 border-blue-500">Travel Agency Dashboard</n-h1>

    <!-- Section 1: Current Company Account Balance -->
    <n-card
      title="Current Company Account Balance"
      :segmented="{ content: true }"
      class="shadow-xl rounded-xl border border-gray-200"
      hoverable
    >
      <n-spin :show="loadingBalances" size="large">
        <n-grid x-gap="24" y-gap="24" :cols="2" :sm="2">
          <n-gi>
            <n-statistic label="Cash Balance" :value="formatCurrency(balances.cash)" class="text-green-700 font-semibold">
              <template #prefix>
                <span class="text-xl">💰</span>
              </template>
            </n-statistic>
          </n-gi>
          <n-gi>
            <n-statistic label="Online Balance" :value="formatCurrency(balances.online)" class="text-blue-700 font-semibold">
              <template #prefix>
                <span class="text-xl">💳</span>
              </template>
            </n-statistic>
          </n-gi>
        </n-grid>
      </n-spin>
    </n-card>

    <!-- Section 2: Date Range Selection, Financial Metrics & Profit Breakdown Chart -->
    <n-grid x-gap="24" y-gap="24" :cols="1" :md="2">
      <!-- Financial Overview Card (Left Half) -->
      <n-gi>
        <n-card
          title="Financial Overview"
          :segmented="{ content: true }"
          class="shadow-xl rounded-xl border border-gray-200 h-full"
          hoverable
        >
          <n-space vertical :size="20">
            <!-- Date Selection and Export Button -->
            <n-space class="table-controls" justify="start" align="center">
              <n-date-picker
                class="date-filter flex-grow"
                v-model:value="dateRange"
                type="daterange"
                :default-value="defaultDateRange"
                @update:value="fetchDashboardData"
              />
              <n-button type="primary" @click="exportFinancialOverviewPdf" :loading="loadingPdf">
                Export PDF
              </n-button>
            </n-space>

            <!-- Financial Metrics -->
            <n-spin :show="loadingMetrics" size="large">
              <n-grid x-gap="16" y-gap="16" :cols="3" :sm="3" :md="4" class="mt-4">
                <n-gi>
                  <n-statistic label="Total Ticket Sales" :value="formatCurrency(metrics.totalTicketSales)" class="text-purple-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Total Agent Charges" :value="formatCurrency(metrics.totalAgentCharges)" class="text-orange-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Profit from Sales" :value="formatCurrency(metrics.profitFromSales)" class="text-green-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Other Service Income" :value="formatCurrency(metrics.otherServiceIncome)" class="text-teal-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Total Expenditure" :value="formatCurrency(metrics.totalExpenditure)" class="text-red-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Net Profit" :value="formatCurrency(metrics.netProfit)" :value-style="{ color: metrics.netProfit >= 0 ? 'green' : 'red' }" class="font-bold text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Total Agent Deposits" :value="formatCurrency(metrics.totalAgentDeposit)" class="text-indigo-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Total Customer Deposits" :value="formatCurrency(metrics.totalCustomerDeposit)" class="text-pink-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Total Agent Credit" :value="formatCurrency(metrics.totalAgentCredit)" class="text-yellow-700 text-sm" />
                </n-gi>
                <n-gi>
                  <n-statistic label="Total Customer Credit" :value="formatCurrency(metrics.totalCustomerCredit)" class="text-cyan-700 text-sm" />
                </n-gi>
              </n-grid>
            </n-spin>
          </n-space>
        </n-card>
      </n-gi>

      <!-- Profit Breakdown by Service Chart (Right Half) -->
      <n-gi>
        <n-card
          title="Profit Breakdown by Service"
          :segmented="{ content: true }"
          class="shadow-xl rounded-xl border border-gray-200 h-full"
          hoverable
        >
          <n-spin :show="loadingCharts" size="large">
            <div ref="profitBreakdownChartRef" class="echarts-container"></div>
          </n-spin>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Section 3: Customer Wallet & Credit Balances -->
    <n-card
      title="Customer Wallet & Credit Balances"
      :segmented="{ content: true }"
      class="shadow-xl rounded-xl border border-gray-200"
      hoverable
    >
      <n-space justify="end" class="mb-4">
        <n-button type="primary" @click="exportCustomerBalancesPdf" :loading="loadingCustomerPdf">
          Export PDF
        </n-button>
      </n-space>
      <n-spin :show="loadingCustomerBalances" size="large">
        <n-data-table
          :columns="customerColumns"
          :data="customerBalances"
          :bordered="false"
          :single-line="false"
          size="small"
        />
      </n-spin>
    </n-card>

    <!-- Section 4: Agent Wallet & Credit Balances -->
    <n-card
      title="Agent Wallet & Credit Balances"
      :segmented="{ content: true }"
      class="shadow-xl rounded-xl border border-gray-200"
      hoverable
    >
      <n-space justify="end" class="mb-4">
        <n-button type="primary" @click="exportAgentBalancesPdf" :loading="loadingAgentPdf">
          Export PDF
        </n-button>
      </n-space>
      <n-spin :show="loadingAgentBalances" size="large">
        <n-data-table
          :columns="agentColumns"
          :data="agentBalances"
          :bordered="false"
          :single-line="false"
          size="small"
        />
      </n-spin>
    </n-card>

    <!-- Section 5: Partner Wallet Balances -->
    <n-card
      title="Partner Wallet Balances"
      :segmented="{ content: true }"
      class="shadow-xl rounded-xl border border-gray-200"
      hoverable
    >
      <n-space justify="end" class="mb-4">
        <n-button type="primary" @click="exportPartnerBalancesPdf" :loading="loadingPartnerPdf">
          Export PDF
        </n-button>
      </n-space>
      <n-spin :show="loadingPartnerBalances" size="large">
        <n-data-table
          :columns="partnerColumns"
          :data="partnerBalances"
          :bordered="false"
          :single-line="false"
          size="small"
        />
      </n-spin>
    </n-card>

    <!-- Section 6: Sales and Expense Trend Line Chart -->
    <n-card
      title="Sales and Expense Trend"
      :segmented="{ content: true }"
      class="shadow-xl rounded-xl border border-gray-200"
      hoverable
    >
      <n-spin :show="loadingCharts" size="large">
        <div ref="salesExpenseChartRef" class="echarts-container"></div>
      </n-spin>
    </n-card>

    <!-- Section 7: Sales by Particular Bar Chart -->
    <n-card
      title="Sales by Service/Particular"
      :segmented="{ content: true }"
      class="shadow-xl rounded-xl border border-gray-200"
      hoverable
    >
      <n-spin :show="loadingCharts" size="large">
        <div ref="particularSalesChartRef" class="echarts-container"></div>
      </n-spin>
    </n-card>
  </n-space>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, h } from 'vue'; 
import {
  NSpace,
  NH1,
  NCard,
  NStatistic,
  NGrid,
  NGi,
  NDatePicker,
  NButton,
  NSpin,
  NDataTable,
  useMessage,
} from 'naive-ui';
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
      } else {
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
  } catch (error) {
    message.error('Failed to fetch company balances: ' + error.message);
    console.error('Error fetching company balances:', error);
  } finally {
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

  } catch (error) {
    message.error('Failed to fetch dashboard data: ' + error.message);
    console.error('Error fetching dashboard data:', error);
  } finally {
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

  } catch (error) {
    message.error('Failed to export PDF: ' + error.message);
    console.error('Error exporting PDF:', error);
  } finally {
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
  } catch (error) {
    message.error('Failed to fetch customer balances: ' + error.message);
    console.error('Error fetching customer balances:', error);
  } finally {
    loadingCustomerBalances.value = false;
  }
};

const fetchAgentBalances = async () => {
  loadingAgentBalances.value = true;
  try {
    const data = await api.get('/api/dashboard/agent_balances');
    agentBalances.value = data;
  } catch (error) {
    message.error('Failed to fetch agent balances: ' + error.message);
    console.error('Error fetching agent balances:', error);
  } finally {
    loadingAgentBalances.value = false;
  }
};

const fetchPartnerBalances = async () => {
  loadingPartnerBalances.value = true;
  try {
    const data = await api.get('/api/dashboard/partner_balances');
    partnerBalances.value = data;
  } catch (error) {
    message.error('Failed to fetch partner balances: ' + error.message);
    console.error('Error fetching partner balances:', error);
  } finally {
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
  } catch (error) {
    message.error('Failed to export customer balances PDF: ' + error.message);
    console.error('Error exporting customer balances PDF:', error);
  } finally {
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
  } catch (error) {
    message.error('Failed to export agent balances PDF: ' + error.message);
    console.error('Error exporting agent balances PDF:', error);
  } finally {
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
  } catch (error) {
    message.error('Failed to export partner balances PDF: ' + error.message);
    console.error('Error exporting partner balances PDF:', error);
  } finally {
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
</script>

<style scoped>
.echarts-container {
  width: 100%;
  height: 320px;
}

.table-controls {
  flex-wrap: wrap;
}
.table-controls > * {
  flex-grow: 1;
  min-width: 150px;
}
</style>
