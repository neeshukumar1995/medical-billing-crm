'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import crmInstance from '@/utils/crmInstance'

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cache = new Map()

const getCacheKey = (companyId, year, month) => 
  `dashboard-${companyId}-${year}-${month || 'all'}`

const getCachedData = (key) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  cache.delete(key)
  return null
}

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() })
}

export const useDashboardData = (isAuthenticated, userRole, userId, selectedYear, selectedMonth) => {
  const [dashboardData, setDashboardData] = useState({
    monthlyRevenue: Array(12).fill(0),
    leadsData: Array(12).fill(0),
    salesData: Array(12).fill(0),
    profitData: Array(12).fill(0),
    salesLabels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    customerGrowth: Array(12).fill(0),
    recentActivities: [],
    dailyLeads: Array(30).fill(0),
    userLeadAssignments: [],
    summaryCards: {
      totalLeads: 0,
      totalCustomers: 0,
      salesReports: 0,
      leadsReports: 0,
      assignedLeads: 0,
      totalnotwokleads: 0,
      unassignedLeads: 0,
    },
    userLeads: [],
    statusDistribution: [],
    leadGrowth: [],
    leadTypes: [],
    topUsers: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  const monthsLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || userRole === '' || !['superadmin', 'admin'].includes(userRole)) {
      setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const companyId = JSON.parse(localStorage.getItem("companyId"))
    const cacheKey = getCacheKey(companyId, selectedYear, selectedMonth)
    
    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      setDashboardData(cachedData)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : ''

      // Parallel API calls using Promise.all
      const [dashboardResponse, leadsResponse, userPerformanceResponse, salesPerformanceResponse] = await Promise.all([
        crmInstance.get(`/dashboard/${companyId}?year=${selectedYear}${monthParam}`, { signal: abortControllerRef.current.signal }),
        crmInstance.get(`/leads/dashboard/${companyId}?year=${selectedYear}${monthParam}`, { signal: abortControllerRef.current.signal }),
        crmInstance.get(`/leads/user-performance/${companyId}?year=${selectedYear}${monthParam}&user_id=${userId}`, { signal: abortControllerRef.current.signal }),
        crmInstance.get(`/sales/performance/${companyId}?year=${selectedYear}${monthParam}`, { signal: abortControllerRef.current.signal })
      ])

      const data = dashboardResponse.data
      const leadsData = leadsResponse.data
      const userPerformanceData = userPerformanceResponse.data
      const salesPerformanceData = salesPerformanceResponse.data

      if (data.status && data.data) {
        const isMonthSelected = selectedMonth !== null
        const salesData = isMonthSelected
          ? (Array.isArray(salesPerformanceData?.data) ? salesPerformanceData.data : [salesPerformanceData?.data ?? 0])
          : (salesPerformanceData?.data || Array(12).fill(0))
        const profitData = isMonthSelected
          ? (Array.isArray(salesPerformanceData?.profitData) ? salesPerformanceData.profitData : [salesPerformanceData?.profitData ?? 0])
          : (salesPerformanceData?.profitData || Array(12).fill(0))
        const salesLabels = isMonthSelected
          ? (Array.isArray(salesPerformanceData?.periodLabels) ? salesPerformanceData.periodLabels : [salesPerformanceData?.periodLabels || monthsLabels[selectedMonth - 1]])
          : (salesPerformanceData?.periodLabels || monthsLabels)

        const rawCards = data.data.summaryCards || {}
        const unassignedLeads =
          rawCards.totalUnassignedLeads ?? rawCards.unassignedLeads ?? rawCards.total_unassigned_leads ?? 0
        const assignedLeads =
          rawCards.totalAssignedLeads ?? rawCards.assignedLeads ?? rawCards.total_assigned_leads ?? 0
        const totalnotwokleads =
          ((rawCards.notworkleads ?? 0)) ||
          (rawCards.totalnotwokleads ?? 0)

        const newData = {
          monthlyRevenue: data.data.monthlyRevenue.map(v => parseFloat(v) || 0),
          leadsData: data.data.leadsData || Array(12).fill(0),
          salesData,
          profitData,
          salesLabels,
          customerGrowth: data.data.customerGrowth || Array(12).fill(0),
          recentActivities: Array.isArray(data.data.recentActivities) ? data.data.recentActivities : [],
          dailyLeads: Array.isArray(data.data.dailyLeads) ? data.data.dailyLeads : Array(30).fill(0),
          userLeadAssignments: Array.isArray(data.data.userLeadAssignments) ? data.data.userLeadAssignments : [],
          summaryCards: {
            totalLeads: rawCards.totalLeads ?? rawCards.total_leads ?? 0,
            totalCustomers: rawCards.totalCustomers ?? rawCards.total_customers ?? 0,
            salesReports: rawCards.salesReports ?? rawCards.sales_reports ?? 0,
            leadsReports: rawCards.leadsReports ?? rawCards.leads_reports ?? 0,
            assignedLeads,
            totalnotwokleads,
            unassignedLeads,
          },
          userLeads: userPerformanceData?.data?.userLeads || [],
          statusDistribution: leadsData?.data?.statusDistribution || [
            { status: 'Converted', count: 0 }, { status: 'No Poc', count: 0 },
            { status: 'follow up scheduled', count: 0 }, { status: 'Unresponsive', count: 0 },
            { status: 'Wrong Number', count: 0 }, { status: 'In Progress', count: 0 },
            { status: 'Denied', count: 0 }, { status: 'Unknown', count: 0 }
          ],
          leadGrowth: leadsData?.data?.leadGrowth || [],
          leadTypes: leadsData?.data?.leadTypes || [
            { type: 'DME', count: 0 }, { type: 'Physician', count: 0 },
            { type: 'Pharmacy', count: 0 }, { type: 'Physical Therapy (PT)', count: 0 },
            { type: 'Miscellaneous', count: 0 }, { type: 'Dentist', count: 0 },
            { type: 'Unknown', count: 0 }
          ],
          topUsers: leadsData?.data?.topUsers || [],
        }

        setDashboardData(newData)
        setCachedData(cacheKey, newData)
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Dashboard API error:', err)
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, userRole, userId, selectedYear, selectedMonth])

  useEffect(() => {
    fetchDashboardData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchDashboardData])

  return { dashboardData, loading, error, refetch: fetchDashboardData }
}

export const useLeadTypes = (crmEnabled = true) => {
  const [leadTypesMapping, setLeadTypesMapping] = useState([])

  useEffect(() => {
    if (!crmEnabled) return
    const fetchLeadTypes = async () => {
      try {
        const cid = JSON.parse(localStorage.getItem("companyId"))
        if (!cid) return
        const response = await crmInstance.get(`/lead-types/${cid}`)
        const data = response.data.data.data || response.data.data || response.data || []
        setLeadTypesMapping(data.map(item => ({ id: item.id, name: item.name })))
      } catch (error) {
        console.error('Error fetching Provider Types:', error)
      }
    }
    fetchLeadTypes()
  }, [crmEnabled])

  return leadTypesMapping
}

export const useLeadStatuses = (crmEnabled = true) => {
  const [leadStatusesMapping, setLeadStatusesMapping] = useState([])

  useEffect(() => {
    if (!crmEnabled) return
    const fetchLeadStatuses = async () => {
      try {
        const cid = JSON.parse(localStorage.getItem("companyId"))
        if (!cid) return
        const response = await crmInstance.get(`/lead-status/${cid}`)
        const data = response.data.data.data || response.data.data || response.data || []
        setLeadStatusesMapping(data.map(item => ({ id: item.id, name: item.name })))
      } catch (error) {
        console.error('Error fetching lead statuses:', error)
      }
    }
    fetchLeadStatuses()
  }, [crmEnabled])

  return leadStatusesMapping
}
