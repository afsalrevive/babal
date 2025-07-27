<template>
    <div class="reports-container">
      <h2>Monthly Report</h2>
      <div class="charts-container">
        <div class="chart-wrapper">
          <line-chart :chart-data="usersData" :options="options" />
        </div>
        <div class="chart-wrapper">
          <bar-chart :chart-data="salesData" :options="options" />
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { Line as LineChart, Bar as BarChart } from 'vue-chartjs'
  import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement } from 'chart.js'
  
  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement)
  
  export default {
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
      }
    },
    mounted() {
      // You could fetch actual data here
    }
  }
  </script>
  
  <style scoped>
  .reports-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  h2 {
    color: #2c3e50;
    margin-bottom: 30px;
  }
  
  .charts-container {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .chart-wrapper {
    flex: 1;
    min-width: 300px;
    height: 400px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  </style>