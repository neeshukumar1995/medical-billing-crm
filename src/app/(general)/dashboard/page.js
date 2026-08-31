'use client'

import Footer from '@/components/shared/Footer'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import useBootstrapUtils from '@/hooks/useBootstrapUtils'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import { encryptId } from "@/utils/encryptId"
import StatCard from '@/components/StatCard'
import { MemoizedChartWrapper, MemoizedSourcesChart } from '@/components/LazyCharts'
import { useDashboardData, useLeadTypes, useLeadStatuses } from '@/hooks/useDashboardData'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import useDebounce from '@/hooks/useDebounce'
import { useUser } from '@/context/UserContext'

/* ─── Corporate design tokens ──────────────────────────────────────────── */
const TOKENS = {
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  shadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
  textPrimary: '#1E293B',
  textMuted: '#64748B',
  headerBg: '#F8FAFC',
  accents: {
    blue: { solid: '#2563EB', tint: 'rgba(37, 99, 235, 0.08)' },
    teal: { solid: '#0D9488', tint: 'rgba(13, 148, 136, 0.08)' },
    amber: { solid: '#B45309', tint: 'rgba(180, 83, 9, 0.08)' },
    rose: { solid: '#B91C1C', tint: 'rgba(185, 28, 28, 0.08)' },
  },
}

const CARD_HEADER_STYLE = {
  background: TOKENS.headerBg,
  borderBottom: `1px solid ${TOKENS.border}`,
}

const CARD_TITLE_STYLE = {
  color: TOKENS.textPrimary,
  fontWeight: 600,
}

/* ─── Per-section loading overlay ──────────────────────────────────────── *
 * Sits absolutely inside a `position: relative` wrapper and covers the
 * section's existing (possibly stale) content while dashboardLoading is
 * true — used on every stat card and every chart card so nothing shows
 * outdated data silently while a fetch is in flight.
 */
const SectionLoader = React.memo(() => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(255, 255, 255, 0.72)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
      borderRadius: '8px',
      backdropFilter: 'blur(1px)',
    }}
  >
    <div
      className="spinner-border spinner-border-sm"
      style={{ color: TOKENS.accents.blue.solid }}
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
))
SectionLoader.displayName = 'SectionLoader'

/* ─── Card SVG Icons (Memoized) ────────────────────────────────────────── */
const IconTotalLeads = React.memo(({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
))
IconTotalLeads.displayName = 'IconTotalLeads'

const IconAssigned = React.memo(({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
))
IconAssigned.displayName = 'IconAssigned'

const IconNotwork = React.memo(({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
))
IconNotwork.displayName = 'IconNotwork'

const IconUnassigned = React.memo(({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/>
    <line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
))
IconUnassigned.displayName = 'IconUnassigned'

/* ─── Lazy Chart Section Component ─────────────────────────────────────── */
const LazyChartSection = React.memo(({ children, className = 'col-xl-12' }) => {
  const { elementRef, hasBeenVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  })

  return (
    <div ref={elementRef} className={className}>
      {hasBeenVisible ? children : (
        <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  )
})
LazyChartSection.displayName = 'LazyChartSection'

/* ─── Main Dashboard Page ─────────────────────────────────────────────── */
const DashboardPage = () => {
  const pathName = usePathname()
  const router = useRouter()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isCompanyChanging, setIsCompanyChanging] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(null)

  // ✅ "/me" ab yahan alag se call nahi hota — shared UserContext se
  // user/role/permissions milte hain (poore app mein sirf ek "/me" call)
  const {
    user,
    role: userRole,
    permissions: userPermissions,
    isAuthenticated,
    loading: isLoading,
  } = useUser()
  const currentUserName = user?.name || ''
  const crmEnabled = user?.company?.crm_enabled !== false
  const userId = user?.id || ''

  // Debounce year and month changes
  const debouncedYear = useDebounce(selectedYear, 300)
  const debouncedMonth = useDebounce(selectedMonth, 300)

  // Custom hooks
  const { dashboardData, loading: dashboardLoading } = useDashboardData(
    isAuthenticated, 
    userRole, 
    userId, 
    debouncedYear, 
    debouncedMonth
  )
  const leadTypesMapping = useLeadTypes(crmEnabled)
  const leadStatusesMapping = useLeadStatuses(crmEnabled)

  useBootstrapUtils(pathName)

  const monthsLabels = useMemo(() => 
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 
    []
  )

  // Check auth — ab yeh shared UserContext ("/me" ek hi baar call hota hai
  // UserProvider mein) ke result pe react karta hai, khud "/me" nahi maangta
  useEffect(() => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true'
    if (!isLoggedIn) {
      router.push('/')
      return
    }

    // Jab tak context ka "/me" fetch complete nahi hota, wait karo
    if (isLoading) return

    // Fetch complete ho gaya lekin user nahi mila (token invalid/expired)
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Redirect non-superadmin — where to depends on which modules this
  // company has turned on. Medical-Billing-only companies send their
  // employees straight to their work queue instead of the CRM's
  // lead-focused user-dashboard, which would be empty/irrelevant for them.
  useEffect(() => {
    if (!userRole) return

    if (['superadmin', 'admin'].includes(userRole)) {
      // Company hasn't enabled CRM — this dashboard has nothing to show,
      // send admins to the medical-billing dashboard instead.
      if (!crmEnabled) {
        router.push('/medical-billing/dashboard')
      }
      return
    }

    const medicalBillingEnabled = user?.company?.medical_billing_enabled !== false
    if (!crmEnabled && medicalBillingEnabled) {
      router.push('/medical-billing/my-task')
    } else {
      router.push('/user-dashboard')
    }
  }, [userRole, user, crmEnabled, router])

  // Update initial load state
  useEffect(() => {
    if (!dashboardLoading && isInitialLoad) {
      setIsInitialLoad(false)
    }
  }, [dashboardLoading, isInitialLoad])

  // Memoized filtered user leads
  const filteredUserLeads = useMemo(() => 
    dashboardData.userLeads.filter(user => user.role !== 'superadmin'),
    [dashboardData.userLeads]
  )

  // Memoized chart options
  const userLeadsOptions = useMemo(() => ({
    chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#2563EB', '#0D9488', '#B45309', '#B91C1C', '#6D28D9', '#0369A1', '#4D7C0F', '#C2410C', '#BE185D', '#475569'],
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%', distributed: false } },
    xaxis: { categories: filteredUserLeads.map(user => user.name), labels: { rotate: -45, style: { colors: TOKENS.textMuted } } },
    yaxis: { labels: { style: { colors: TOKENS.textMuted } } },
    grid: { borderColor: TOKENS.border },
    legend: { position: 'top', labels: { colors: TOKENS.textMuted }, onItemClick: { toggleDataSeries: true }, onItemHover: { highlightDataSeries: true } },
    tooltip: { y: { formatter: val => val + ' leads' } },
    dataLabels: { enabled: false }
  }), [filteredUserLeads])

  const statusDistributionOptions = useMemo(() => ({
    chart: {
      type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit',
      events: {
        click: (event, chartContext, config) => {
          const dataPointIndex = config.dataPointIndex
          const selectedStatus = dashboardData.statusDistribution[dataPointIndex]
          if (selectedStatus) {
            const params = new URLSearchParams()
            if (debouncedYear) params.append('year', debouncedYear)
            if (debouncedMonth) params.append('month', debouncedMonth)
            if (selectedStatus.status === 'Converted') {
              router.push(`/leads/converted-leads?${params.toString()}`)
            } else if (selectedStatus.status === 'Follow Up') {
              router.push(`/leads/User-Follow-Ups?${params.toString()}`)
            } else {
              const mapping = leadStatusesMapping.find(m => m.name === selectedStatus.status)
              if (mapping) {
                params.append('lead_status_id', encryptId(mapping.id))
                router.push(`/leads/list?${params.toString()}`)
              } else if (selectedStatus.status === 'Unknown') {
                params.append('lead_status_id', 'NULL')
                router.push(`/leads/list?${params.toString()}`)
              } else {
                console.error(`Mapping not found for status: ${selectedStatus.status}`)
              }
            }
          }
        }
      }
    },
    colors: ['#0D9488', '#B45309', '#2563EB', '#B91C1C', '#6D28D9', '#0369A1', '#4D7C0F', '#475569'],
    plotOptions: { bar: { borderRadius: 3, horizontal: false, columnWidth: '55%', distributed: true } },
    dataLabels: { enabled: true, formatter: val => val, style: { fontSize: '12px', colors: ['#fff'] } },
    xaxis: { categories: dashboardData.statusDistribution.map(item => item.status), labels: { rotate: -45, style: { fontSize: '12px', colors: TOKENS.textMuted } } },
    yaxis: { title: { text: 'Number of Leads', style: { color: TOKENS.textMuted } }, labels: { style: { colors: TOKENS.textMuted } } },
    grid: { borderColor: TOKENS.border },
    tooltip: { y: { formatter: val => val + ' leads' } },
    legend: { show: false }
  }), [dashboardData.statusDistribution, debouncedYear, debouncedMonth, leadStatusesMapping, router])

  const leadTypesOptions = useMemo(() => ({
    chart: {
      type: 'donut', height: 300, toolbar: { show: false }, fontFamily: 'inherit',
      events: {
        click: (event, chartContext, config) => {
          const dataPointIndex = config.dataPointIndex
          const selectedType = dashboardData.leadTypes[dataPointIndex]
          if (selectedType) {
            const params = new URLSearchParams()
            if (debouncedYear) params.append('year', debouncedYear)
            if (debouncedMonth) params.append('month', debouncedMonth)
            if (selectedType.id) {
              params.append('lead_type_id', encryptId(selectedType.id))
              router.push(`/leads/list?${params.toString()}`)
            } else if (selectedType.type === 'Unknown') {
              params.append('lead_type_id', 'NULL')
              router.push(`/leads/list?${params.toString()}`)
            } else {
              const mapping = leadTypesMapping.find(m => m.name === selectedType.type)
              if (mapping) {
                params.append('lead_type_id', encryptId(mapping.id))
                router.push(`/leads/list?${params.toString()}`)
              } else {
                console.error(`Mapping not found for type: ${selectedType.type}`)
              }
            }
          }
        }
      }
    },
    colors: ['#2563EB', '#0D9488', '#B45309', '#B91C1C', '#6D28D9', '#0369A1', '#4D7C0F'],
    labels: dashboardData.leadTypes.map(item => item.type),
    legend: {
      position: 'bottom', show: true, labels: { colors: TOKENS.textMuted },
      formatter: (seriesName, opts) => {
        const count = opts.w.globals.series[opts.seriesIndex] || 0
        return seriesName + ': ' + count + ' leads'
      }
    },
    tooltip: { y: { formatter: val => val + ' leads' } },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        const count = opts.w.globals.series[opts.seriesIndex] || 0
        if (count === 0) return '0%'
        return val.toFixed(1) + '%'
      },
      style: { fontSize: '12px', colors: ['#fff'] }
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true, label: 'Total Leads', color: TOKENS.textPrimary,
              formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    },
    states: { hover: { filter: { type: 'darken', value: 0.05 } } }
  }), [dashboardData.leadTypes, debouncedYear, debouncedMonth, leadTypesMapping, router])

  // Build query params helper
  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedYear) params.append('year', debouncedYear)
    if (debouncedMonth) params.append('month', debouncedMonth)
    return params.toString()
  }, [debouncedYear, debouncedMonth])

  // Memoized summary cards config — flat, corporate style: white card, subtle
  // shadow/border, and a single muted accent used only for the icon badge & dot.
  const summaryCards = useMemo(() => [
    {
      title: 'Total Leads',
      key: 'totalLeads',
      bg: TOKENS.cardBg,
      border: TOKENS.border,
      shadow: TOKENS.shadow,
      iconBg: TOKENS.accents.blue.tint,
      badgeBg: TOKENS.accents.blue.tint,
      badgeColor: TOKENS.accents.blue.solid,
      dotColor: TOKENS.accents.blue.solid,
      badgeLabel: 'All time',
      icon: <IconTotalLeads color={TOKENS.accents.blue.solid} />,
      onClick: () => { /* Total leads — no navigation per original logic */ },
    },
    {
      title: 'Total Assigned Leads',
      key: 'assignedLeads',
      bg: TOKENS.cardBg,
      border: TOKENS.border,
      shadow: TOKENS.shadow,
      iconBg: TOKENS.accents.teal.tint,
      badgeBg: TOKENS.accents.teal.tint,
      badgeColor: TOKENS.accents.teal.solid,
      dotColor: TOKENS.accents.teal.solid,
      badgeLabel: 'Active',
      icon: <IconAssigned color={TOKENS.accents.teal.solid} />,
      onClick: () => router.push(`/leads/list?assigned=true&${buildParams()}`),
    },
    {
      title: 'Assigned Leads (Not Working)',
      key: 'totalnotwokleads',
      bg: TOKENS.cardBg,
      border: TOKENS.border,
      shadow: TOKENS.shadow,
      iconBg: TOKENS.accents.amber.tint,
      badgeBg: TOKENS.accents.amber.tint,
      badgeColor: TOKENS.accents.amber.solid,
      dotColor: TOKENS.accents.amber.solid,
      badgeLabel: 'Closed',
      icon: <IconNotwork color={TOKENS.accents.amber.solid} />,
      onClick: () => router.push(`/leads/list?assigned=true&lead_status_id=NULL&${buildParams()}`),
    },
    {
      title: 'Unassigned Leads',
      key: 'unassignedLeads',
      bg: TOKENS.cardBg,
      border: TOKENS.border,
      shadow: TOKENS.shadow,
      iconBg: TOKENS.accents.rose.tint,
      badgeBg: TOKENS.accents.rose.tint,
      badgeColor: TOKENS.accents.rose.solid,
      dotColor: TOKENS.accents.rose.solid,
      badgeLabel: 'Pending',
      icon: <IconUnassigned color={TOKENS.accents.rose.solid} />,
      onClick: () => router.push(`/leads/raw-leads?${buildParams()}`),
    },
  ], [buildParams, router])

  // Memoized user leads series
  const userLeadsSeries = useMemo(() => [
    { name: 'Total',               data: filteredUserLeads.map(user => user.total) },
    { name: 'Converted',           data: filteredUserLeads.map(user => user.statuses?.Converted || 0) },
    { name: 'In Progress',         data: filteredUserLeads.map(user => user.statuses?.['In Progress'] || 0) },
    { name: 'follow up scheduled', data: filteredUserLeads.map(user => user.statuses?.['follow up scheduled'] || 0) },
    { name: 'Wrong Number',        data: filteredUserLeads.map(user => user.statuses?.['Wrong Number'] || 0) },
    { name: 'Denied',              data: filteredUserLeads.map(user => user.statuses?.Denied || 0) },
    { name: 'Unresponsive',        data: filteredUserLeads.map(user => user.statuses?.Unresponsive || 0) },
    { name: 'No Poc',              data: filteredUserLeads.map(user => user.statuses?.['No Poc'] || 0) }
  ], [filteredUserLeads])

  // Loading state
 if (isLoading || (dashboardLoading && isInitialLoad) || !isAuthenticated || isCompanyChanging || !['superadmin', 'admin'].includes(userRole) || !crmEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          {dashboardLoading && !isInitialLoad && (
            <span style={{ color: TOKENS.textMuted, fontWeight: 600 }}>Updating…</span>
          )}
          <select
            className="form-select form-select-sm"
            style={{ width: '150px', borderColor: TOKENS.border, color: TOKENS.textPrimary }}
            value={selectedYear}
            onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedMonth(null) }}
            disabled={dashboardLoading}
          >
            {Array.from({ length: 27 }, (_, i) => {
              const year = 2024 + i
              return <option key={year} value={year}>{year}</option>
            })}
          </select>
          <select
            className="form-select form-select-sm"
            style={{ width: '150px', borderColor: TOKENS.border, color: TOKENS.textPrimary }}
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
            disabled={dashboardLoading}
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(selectedYear, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      <div className='main-content' style={{ background: '#F8FAFC' }}>
        <div className='row'>

          {/* ── Summary Cards (flat, corporate) ── */}
          {summaryCards.map((card, idx) => (
            <div
              className="col-xl-3 col-lg-6 col-md-6 col-sm-6"
              key={idx}
              style={{ marginBottom: '0', position: 'relative' }}
            >
              <StatCard
                title={card.title}
                value={dashboardData.summaryCards[card.key]}
                bg={card.bg}
                border={card.border}
                shadow={card.shadow}
                iconBg={card.iconBg}
                badgeBg={card.badgeBg}
                badgeColor={card.badgeColor}
                dotColor={card.dotColor}
                badgeLabel={card.badgeLabel}
                icon={card.icon}
                onClick={card.onClick}
                titleColor={TOKENS.textMuted}
                valueColor={TOKENS.textPrimary}
              />
              {dashboardLoading && <SectionLoader />}
            </div>
          ))}

          {/* ── Assigned Lead By Status (Lazy loaded) ── */}
          <LazyChartSection className='col-xl-6 pt-3'>
            <div className='card' style={{ border: `1px solid ${TOKENS.border}`, boxShadow: TOKENS.shadow, position: 'relative' }}>
              <div className='card-header' style={CARD_HEADER_STYLE}>
                <h5 className='card-title' style={CARD_TITLE_STYLE}>Assigned Lead By Status</h5>
              </div>
              <div className='card-body'>
                <MemoizedChartWrapper
                  options={statusDistributionOptions}
                  series={[{ name: 'Leads', data: dashboardData.statusDistribution.map(item => item.count) }]}
                  type="bar"
                  height={300}
                />
              </div>
              {dashboardLoading && <SectionLoader />}
            </div>
          </LazyChartSection>

          {/* ── Leads By Provider Type (Lazy loaded) ── */}
          <LazyChartSection className='col-xl-6 pt-3'>
            <div className='card' style={{ border: `1px solid ${TOKENS.border}`, boxShadow: TOKENS.shadow, position: 'relative' }}>
              <div className='card-header' style={CARD_HEADER_STYLE}>
                <h5 className='card-title' style={CARD_TITLE_STYLE}>Leads By Provider Type</h5>
              </div>
              <div className='card-body'>
                <MemoizedChartWrapper
                  options={leadTypesOptions}
                  series={dashboardData.leadTypes.map(item => item.count)}
                  type="donut"
                  height={300}
                />
              </div>
              {dashboardLoading && <SectionLoader />}
            </div>
          </LazyChartSection>

          {/* ── Production By Agent (Lazy loaded) ── */}
          <LazyChartSection>
            <div className='card' style={{ border: `1px solid ${TOKENS.border}`, boxShadow: TOKENS.shadow, position: 'relative' }}>
              <div className="card-header" style={CARD_HEADER_STYLE}>
                <h5 className="card-title" style={CARD_TITLE_STYLE}>Production By Agent (MTD)</h5>
              </div>
              <div className='card-body'>
                <MemoizedChartWrapper
                  options={userLeadsOptions}
                  series={userLeadsSeries}
                  type="bar"
                  height={300}
                />
              </div>
              {dashboardLoading && <SectionLoader />}
            </div>
          </LazyChartSection>

          {/* ── Sources Chart (Lazy loaded) ── */}
          <LazyChartSection>
            <div style={{ position: 'relative' }}>
              <MemoizedSourcesChart year={debouncedYear} month={debouncedMonth} />
              {dashboardLoading && <SectionLoader />}
            </div>
          </LazyChartSection>

        </div>
      </div>
      <Footer />
    </>
  )
}

export default DashboardPage