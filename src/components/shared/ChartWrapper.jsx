'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Dynamically import ReactApexChart with proper SSR handling
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
})

const ChartWrapper = ({ options, series, type, height = 300 }) => {
  // Ensure series is always an array
  const safeSeries = React.useMemo(() => {
    if (!series) return []
    if (Array.isArray(series)) return series
    return [series]
  }, [series])

  // Process options to handle formatters properly for client components
  const processedOptions = React.useMemo(() => {
    if (!options) return {}

    // Shallow clone to preserve functions like events
    const clonedOptions = { ...options }

    // Handle yaxis labels formatter
    if (clonedOptions.yaxis && clonedOptions.yaxis.labels && clonedOptions.yaxis.labels.formatter && typeof clonedOptions.yaxis.labels.formatter === 'string') {
      const formatterType = clonedOptions.yaxis.labels.formatter
      if (formatterType === 'K') {
        clonedOptions.yaxis.labels.formatter = (val) => `${val}K`
      } else if (formatterType === '%') {
        clonedOptions.yaxis.labels.formatter = (val) => `${val}%`
      } else if (formatterType === 'currency') {
        clonedOptions.yaxis.labels.formatter = (val) => `$${val}K`
      } else {
        clonedOptions.yaxis.labels.formatter = (val) => `${val}`
      }
    }

    // Handle tooltip formatter
    if (clonedOptions.tooltip && clonedOptions.tooltip.y && clonedOptions.tooltip.y.formatter && typeof clonedOptions.tooltip.y.formatter === 'string') {
      const formatterType = clonedOptions.tooltip.y.formatter
      if (formatterType === 'currency') {
        clonedOptions.tooltip.y.formatter = (val) => `$${val}K`
      } else if (formatterType === '%') {
        clonedOptions.tooltip.y.formatter = (val) => `${val}%`
      } else if (formatterType === 'leads') {
        clonedOptions.tooltip.y.formatter = (val) => `${val} leads`
      } else {
        clonedOptions.tooltip.y.formatter = (val) => `${val}`
      }
    }

    // Handle dataLabels formatter
    if (clonedOptions.dataLabels && clonedOptions.dataLabels.formatter && typeof clonedOptions.dataLabels.formatter === 'string') {
      const formatterType = clonedOptions.dataLabels.formatter
      if (formatterType === 'K') {
        clonedOptions.dataLabels.formatter = (val) => `${val}K`
      } else {
        clonedOptions.dataLabels.formatter = (val) => `${val}`
      }
    }

    return clonedOptions
  }, [options])

  // Only render if we have valid data
  if (!safeSeries.length) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
        <div className="text-muted">No data available</div>
      </div>
    )
  }

  return (
    <ReactApexChart
      options={processedOptions}
      series={safeSeries}
      type={type}
      height={height}
    />
  )
}

export default ChartWrapper