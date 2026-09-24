import Footer from '@/components/shared/Footer'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ChartWrapper from '@/components/shared/ChartWrapper'
import PermissionGuard from '@/components/shared/PermissionGuard'
import React from 'react'

const page = () => {
  // Sales data
  const totalSalesData = [20, 10, 18, 12, 25, 10, 20, 15, 22, 18, 25, 30]
  const salesPipelineData = [15, 12, 18, 20, 25, 22, 28, 30, 25, 20, 18, 22]
  const monthlyRevenue = [45, 52, 38, 65, 72, 58, 85, 92, 78, 88, 95, 102]

  // Chart options
  const totalSalesOptions = {
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: false }
    },
    colors: ['#93a9ff'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', opacityFrom: 0.4, opacityTo: 0.1 } },
    series: [{ name: 'Total Sales', data: totalSalesData }],
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    yaxis: { labels: { formatter: 'K' } },
    tooltip: { y: { formatter: 'currency' } }
  }

  const salesPipelineOptions = {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false }
    },
    colors: ['#4ade80', '#f59e0b', '#ef4444'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%'
      }
    },
    series: [
      { name: 'Won', data: [12, 15, 8, 18, 22, 16, 25, 28, 20, 24, 18, 22] },
      { name: 'In Progress', data: [8, 10, 12, 15, 18, 14, 20, 22, 16, 18, 15, 20] },
      { name: 'Lost', data: [5, 7, 6, 8, 10, 9, 12, 14, 11, 13, 10, 15] }
    ],
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    yaxis: { labels: { formatter: 'default' } }
  }

  const revenueOptions = {
    chart: {
      type: 'line',
      height: 300,
      toolbar: { show: false }
    },
    colors: ['#8b5cf6'],
    stroke: { curve: 'smooth', width: 3 },
    series: [{ name: 'Revenue', data: monthlyRevenue }],
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    yaxis: { labels: { formatter: 'currency' } },
    tooltip: { y: { formatter: 'currency' } }
  }

  return (
    <PermissionGuard permission="view-reports">
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          <h3 className="page-title">Sales Report</h3>
          <span className="badge bg-primary">2024</span>
        </div>
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          {/* Summary Cards */}
          <div className='col-xl-3 col-lg-6 col-md-6 col-sm-6'>
            <div className='card'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar lg bg-primary rounded-circle'>
                    <i className='ti ti-currency-dollar fs-20'></i>
                  </div>
                  <div className='ms-3'>
                    <h6 className='text-muted mb-1'>Total Revenue</h6>
                    <h4 className='mb-0'>$847K</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='col-xl-3 col-lg-6 col-md-6 col-sm-6'>
            <div className='card'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar lg bg-success rounded-circle'>
                    <i className='ti ti-trending-up fs-20'></i>
                  </div>
                  <div className='ms-3'>
                    <h6 className='text-muted mb-1'>Sales Growth</h6>
                    <h4 className='mb-0'>+12.5%</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='col-xl-3 col-lg-6 col-md-6 col-sm-6'>
            <div className='card'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar lg bg-warning rounded-circle'>
                    <i className='ti ti-shopping-cart fs-20'></i>
                  </div>
                  <div className='ms-3'>
                    <h6 className='text-muted mb-1'>Total Orders</h6>
                    <h4 className='mb-0'>1,247</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='col-xl-3 col-lg-6 col-md-6 col-sm-6'>
            <div className='card'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar lg bg-info rounded-circle'>
                    <i className='ti ti-users fs-20'></i>
                  </div>
                  <div className='ms-3'>
                    <h6 className='text-muted mb-1'>New Customers</h6>
                    <h4 className='mb-0'>342</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className='col-xl-8 col-lg-7'>
            <div className='card'>
              <div className='card-header'>
                <h5 className='card-title'>Sales Overview</h5>
              </div>
              <div className='card-body'>
                <ChartWrapper
                  options={totalSalesOptions}
                  series={totalSalesOptions.series}
                  type="area"
                  height={300}
                />
              </div>
            </div>
          </div>

          <div className='col-xl-4 col-lg-5'>
            <div className='card'>
              <div className='card-header'>
                <h5 className='card-title'>Sales Pipeline</h5>
              </div>
              <div className='card-body'>
                <ChartWrapper
                  options={salesPipelineOptions}
                  series={salesPipelineOptions.series}
                  type="bar"
                  height={300}
                />
              </div>
            </div>
          </div>

          <div className='col-xl-12'>
            <div className='card'>
              <div className='card-header'>
                <h5 className='card-title'>Monthly Revenue Trend</h5>
              </div>
              <div className='card-body'>
                <ChartWrapper
                  options={revenueOptions}
                  series={revenueOptions.series}
                  type="line"
                  height={300}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </PermissionGuard>
  )
}

export default page