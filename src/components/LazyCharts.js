'use client'

import dynamic from 'next/dynamic'
import React from 'react'

// Lazy load ChartWrapper with no SSR
export const LazyChartWrapper = dynamic(
  () => import('@/components/shared/ChartWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
)

// Lazy load SourcesChart with no SSR
export const LazySourcesChart = dynamic(
  () => import('@/components/SourcesChart'),
  { 
    ssr: false,
    loading: () => (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
)

// Memoized chart wrapper to prevent unnecessary re-renders
export const MemoizedChartWrapper = React.memo(({ options, series, type, height }) => (
  <LazyChartWrapper
    options={options}
    series={series}
    type={type}
    height={height}
  />
))

MemoizedChartWrapper.displayName = 'MemoizedChartWrapper'

export const MemoizedSourcesChart = React.memo(({ year, month }) => (
  <LazySourcesChart year={year} month={month} />
))

MemoizedSourcesChart.displayName = 'MemoizedSourcesChart'
