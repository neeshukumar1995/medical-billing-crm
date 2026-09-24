'use client'
import Footer from '@/components/shared/Footer'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import SelectDropdown from '@/components/shared/SelectDropdown'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FiEye, FiClock, FiEdit2, FiFilter, FiChevronUp, FiChevronDown, FiSearch } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { encryptId, decryptId } from '@/utils/encryptId';
import { formatDate } from '@/utils/formatDate'
import dynamic from 'next/dynamic'
import '@/styles/leadsReport.css'

// ── NEW: View / Edit popups, loaded only when first opened ──
const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })
const cleanNumberDisplay = (val) => {
  if (val === null || val === undefined) return val
  const str = String(val)
  return str.replace(/^'+/, '').trim()
}
const page = () => {
  const router = useRouter()
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [statusCounts, setStatusCounts] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [leadTypes, setLeadTypes] = useState([])
  const [leadStatuses, setLeadStatuses] = useState([])
  const [designations, setDesignations] = useState([])
  const [states, setStates] = useState([])
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterStatusId, setFilterStatusId] = useState('')
  const [filterDesignation, setFilterDesignation] = useState('')
  const [filterState, setFilterState] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [filteredLeads, setFilteredLeads] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  // ── NEW: raw total record count from API (additive only, used for footer display) ──
  const [totalRecords, setTotalRecords] = useState(0)

  // ── entries-per-page control ──
  const [perPage, setPerPage] = useState(10)
  const entriesPerPageOptions = [
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' },
    { value: '500', label: '500 per page' },
    { value: '1000', label: '1000 per page' },
  ]

  // ── View / Edit popup state ──
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewLeadId, setViewLeadId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLeadId, setEditLeadId] = useState(null)

  // ── NEW: purely visual/UI state — does not touch data, filters, or API calls ──
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedRowIds, setSelectedRowIds] = useState(new Set())

  const handleOpenView = useCallback((leadId) => {
    setViewLeadId(leadId)
    setShowViewModal(true)
  }, [])
  const handleCloseView = useCallback(() => {
    setShowViewModal(false)
    setViewLeadId(null)
  }, [])
  const handleOpenEdit = useCallback((leadId) => {
    setEditLeadId(leadId)
    setShowEditModal(true)
  }, [])
  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false)
    setEditLeadId(null)
  }, [])

  // ─── store parsed URL params in a ref so fetchLeads can always read them ───
  const urlParamsRef = useRef({ typeId: '', statusId: '', year: '', month: '' })

  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('companyId')
      return stored ? JSON.parse(stored) : null
    }
    return null
  })

  // ─── Read URL params ONCE, store in ref AND state ───────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const encryptedTypeId = params.get('lead_type_id')
      const encryptedStatusId = params.get('lead_status_id')
      const yearParam = params.get('year')
      const monthParam = params.get('month')

      let resolvedTypeId = ''
      let resolvedStatusId = ''

      if (encryptedTypeId) {
        if (encryptedTypeId === 'NULL') {
          resolvedTypeId = 'NULL'
        } else {
          resolvedTypeId = decryptId(encryptedTypeId) || ''
        }
      }

      if (encryptedStatusId) {
        if (encryptedStatusId === 'NULL') {
          resolvedStatusId = 'NULL'
        } else {
          resolvedStatusId = decryptId(encryptedStatusId) || ''
        }
      }

      urlParamsRef.current = {
        typeId: resolvedTypeId,
        statusId: resolvedStatusId,
        year: yearParam || '',
        month: monthParam || '',
      }

      if (resolvedTypeId && resolvedTypeId !== 'NULL') setFilterTypeId(resolvedTypeId)
      if (resolvedStatusId && resolvedStatusId !== 'NULL') setFilterStatusId(resolvedStatusId)

      if (yearParam && monthParam) {
        const year = parseInt(yearParam)
        const month = parseInt(monthParam) - 1
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        const formatDate = (d) => {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
        setFromDate(formatDate(startDate))
        setToDate(formatDate(endDate))
      } else if (yearParam) {
        setFromDate(`${yearParam}-01-01`)
        setToDate(`${yearParam}-12-31`)
      }
    }
  }, [])

  const isSuperAdmin =
    currentUserRole === 'superadmin' || currentUserRole === 'admin'

  const fetchStatusCounts = async () => {
    try {
      const cid = companyId
      if (!cid) return
      const response = await crmInstance.get(`/reports/leads/status-counts/${cid}`)
      if (response.data.success || response.data.status) {
        setStatusCounts(response.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching status counts:', error)
      setStatusCounts([])
    }
  }

  const fetchUsers = async () => {
    try {
      const cid = companyId
      if (!cid) return
      const response = await crmInstance.get(`/reports/leads/users-for-filter/${cid}`)
      if (response.data.success || response.data.status) {
        const usersData = response.data.data || []
        const userOptions = usersData.map(user => ({
          value: String(user.id),
          label: user.name,
          avatar: user.name ? user.name.charAt(0).toUpperCase() : 'U'
        }))
        setUsers(userOptions)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    }
  }

  const fetchLeadTypes = async () => {
    try {
      const cid = companyId
      if (!cid) return
      const response = await crmInstance.get(`/lead-types/${cid}`)
      const data = response.data.data.data || response.data.data || response.data || []
      const options = Array.isArray(data) ? data.map(item => ({
        value: String(item.id),
        label: item.name
      })) : []
      setLeadTypes(options)
    } catch (error) {
      console.error('Error fetching Provider Types:', error)
      setLeadTypes([])
    }
  }

  const fetchLeadStatuses = async () => {
    try {
      const cid = companyId
      if (!cid) return
      const response = await crmInstance.get(`/lead-status/${cid}`)
      const data = response.data.data.data || response.data.data || response.data || []
      const options = Array.isArray(data) ? data.map(item => ({
        value: String(item.id),
        label: item.name
      })) : []
      setLeadStatuses(options)
    } catch (error) {
      console.error('Error fetching lead statuses:', error)
      setLeadStatuses([])
    }
  }

  const fetchDesignations = async () => {
    try {
      const cid = companyId
      if (!cid) return
      const response = await crmInstance.get(`/allreports-leads/designation/${cid}`)
      const data = response.data.data || []
      setDesignations(data)
    } catch (error) {
      console.error('Error fetching designations:', error)
      setDesignations([])
    }
  }

  const fetchStates = async () => {
    try {
      const cid = companyId
      if (!cid) return
      const response = await crmInstance.get(`/allreports/states/${cid}`)
      const data = response.data.data || []
      setStates(data)
    } catch (error) {
      console.error('Error fetching states:', error)
      setStates([])
    }
  }

  // ─── fetchLeads reads from urlParamsRef (synchronous) for initial load ──
  // ── per_page comes from the perPage state ──
  const fetchLeads = async (page = 1) => {
    try {
      setLoading(true)
      const cid = companyId
      if (!cid) return

      const params = { page, per_page: perPage }
      if (isSuperAdmin && filterUserId) params.user_id = filterUserId

      const refTypeId = urlParamsRef.current.typeId
      const refStatusId = urlParamsRef.current.statusId
      const refYear = urlParamsRef.current.year
      const refMonth = urlParamsRef.current.month

      const activeTypeId = filterTypeId || refTypeId
      const activeStatusId = filterStatusId || refStatusId

      if (activeTypeId && activeTypeId !== 'NULL') params.type_id = activeTypeId
      if (activeTypeId === 'NULL') params.type_id = 'NULL'
      if (activeStatusId && activeStatusId !== 'NULL') params.status_id = activeStatusId
      if (activeStatusId === 'NULL') params.status_id = 'NULL'

      if (filterDesignation) params.designation = filterDesignation
      if (filterState) params.state = filterState

      const activeYear = refYear
      const activeMonth = refMonth

      // ── FIX: year/month (from dashboard URL) only wins if still set.
      // As soon as user manually picks From/To Date, urlParamsRef.current.year/month
      // get cleared in the input onChange handlers below, so this else-branch
      // (from_date/to_date) takes over correctly. ──
      if (activeYear) {
        params.year = activeYear
        if (activeMonth) params.month = activeMonth
      } else {
        if (fromDate) params.from_date = fromDate
        if (toDate) params.to_date = toDate
      }

      const response = await crmInstance.get(`/reports/leads/masterfilter/${cid}`, { params })

      if (response.data.status) {
        const paginationData = response.data.data
        const newData = paginationData.data
        setLeads(newData)
        setTotalPages(paginationData.last_page)
        setCurrentPage(paginationData.current_page)
        // additive only — used for the footer "Total Records" display
        setTotalRecords(paginationData.total ?? newData.length)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const role = user.role || ''
    setCurrentUserRole(role)
  }, [])

  useEffect(() => {
    if (companyId) {
      fetchStatusCounts()
      fetchLeadTypes()
      fetchLeadStatuses()
      fetchDesignations()
      fetchStates()
      setTimeout(() => fetchLeads(1), 0)
    }
  }, [companyId])

  useEffect(() => {
    if (companyId && isSuperAdmin) {
      fetchUsers()
    }
  }, [companyId, isSuperAdmin])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLeads(leads)
    } else {
      const filtered = leads.filter(lead => {
        const search = searchTerm.toLowerCase()
        return (
          (lead.assigned_to?.name || '').toLowerCase().includes(search) ||
          (lead.lead_status?.name || '').toLowerCase().includes(search) ||
          (lead.source || '').toLowerCase().includes(search) ||
          (lead.company || '').toLowerCase().includes(search) ||
          (lead.client_name || '').toLowerCase().includes(search) ||
          (lead.phone || '').toLowerCase().includes(search) ||
          (lead.email || '').toLowerCase().includes(search) ||
          (lead.website || '').toLowerCase().includes(search) ||
          (lead.lead_type?.name || '').toLowerCase().includes(search) ||
          (lead.state || '').toLowerCase().includes(search) ||
          (lead.designation || '').toLowerCase().includes(search) ||
          getLeadAge(lead.created_at).toLowerCase().includes(search) ||
          new Date(lead.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' }).toLowerCase().includes(search) ||
          new Date(lead.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' }).toLowerCase().includes(search)
        )
      })
      setFilteredLeads(filtered)
    }
  }, [leads, searchTerm])

  // ── NEW: Next Follow-up Date helpers ──────────────────────────────────
  // Same "follow up / in progress" matching used everywhere else in the app
  // (BulkStatusModal, LeadsPageClient, backend updateStatusWithNote) — keep
  // this identical across all of those so a status is treated consistently.
  const isFollowUpStatus = (label = '') => /follow up|progress/i.test(label)

  const fmtFuDate = (d) => {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt)) return d
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' })
  }

  // Follow-up date is only meaningful while the lead is sitting in a
  // Follow Up / In Progress status — for other statuses the backend clears
  // it to null, so this naturally hides stale dates.
  const getNextFollowupDate = (lead) => {
    if (!isFollowUpStatus(lead.lead_status?.name || '')) return null
    return lead.followup_date || lead.follow_up_date || lead.next_followup_date || null
  }

  // ── Sort: leads with an upcoming Next Follow-up date first (soonest first),
  // leads without one after, in their existing order. ──
  const sortedLeads = React.useMemo(() => {
    const withFu = []
    const withoutFu = []
    filteredLeads.forEach(lead => {
      const raw = getNextFollowupDate(lead)
      if (raw) withFu.push(lead)
      else withoutFu.push(lead)
    })
    withFu.sort((a, b) => new Date(getNextFollowupDate(a)) - new Date(getNextFollowupDate(b)))
    return [...withFu, ...withoutFu]
  }, [filteredLeads])

  const filteredStatusCounts = React.useMemo(() => {
    const statusMap = {}
    filteredLeads.forEach(lead => {
      const statusName = lead.lead_status?.name || 'N/A'
      statusMap[statusName] = (statusMap[statusName] || 0) + 1
    })
    return Object.entries(statusMap).map(([status, count]) => ({ status, count }))
  }, [filteredLeads])

  // ── perPage added as a dependency so changing it refetches page 1 ──
  useEffect(() => {
    if (companyId) {
      setCurrentPage(1)
      fetchLeads(1)
    }
  }, [filterUserId, filterTypeId, filterStatusId, filterDesignation, filterState, fromDate, toDate, companyId, perPage])

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchLeads(page)
    }
  }

  // 👇 dynamic status color palette (jitne bhi statuses aayein, sabko consistent unique color)
  const DYNAMIC_STATUS_COLORS = [
    { bg: '#eaf3de', color: '#27500A', dot: '#3B6D11' }, // green
    { bg: '#E6F1FB', color: '#0C447C', dot: '#185FA5' }, // blue
    { bg: '#F3EAFB', color: '#4B2172', dot: '#6D28D9' }, // purple
    { bg: '#FAEEDA', color: '#633806', dot: '#854F0B' }, // amber
    { bg: '#FBEAF0', color: '#72243E', dot: '#993556' }, // pink
    { bg: '#E1F5EE', color: '#085041', dot: '#0F6E56' }, // teal
    { bg: '#F1EFE8', color: '#444441', dot: '#5F5E5A' }, // grey
    { bg: '#E9F7FE', color: '#0B4A63', dot: '#0EA5E9' }, // sky
    { bg: '#FDEEE3', color: '#7C2D12', dot: '#C2410C' }, // orange
    { bg: '#EEF6D8', color: '#3F5B0B', dot: '#65A30D' }, // lime
    { bg: '#F4EAFE', color: '#5B1E82', dot: '#A855F7' }, // violet
    { bg: '#E3F6F5', color: '#0C5F5C', dot: '#14B8A6' }, // cyan
  ]

  // status name se consistent hash — hamesha same status ko same color milega
  const hashStatusName = (name = '') => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  const getStatusStyle = (status) => {
    if (!status) return { bg: '#F1EFE8', color: '#444441', dot: '#888780' }

    const norm = status.toLowerCase().replace(/[-\s]/g, '')

    // "Non-Worked" ko hamesha RED fix
    if (norm.includes('nonworked')) {
      return { bg: '#FCEBEB', color: '#791F1F', dot: '#A32D2D' }
    }

    // "In Progress" ko hamesha GREEN fix
    if (norm.includes('progress')) {
      return { bg: '#eaf3de', color: '#27500A', dot: '#3B6D11' }
    }

    const idx = hashStatusName(status) % DYNAMIC_STATUS_COLORS.length
    return DYNAMIC_STATUS_COLORS[idx]
  }

  const getLeadAge = (createdAt) => {
    if (!createdAt) return 'N/A'
    try {
      const createdDate = new Date(createdAt)
      const today = new Date()
      const diffTime = today - createdDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return '1 day'
      return `${diffDays} days`
    } catch {
      return 'N/A'
    }
  }

  const getVisiblePages = (current, total) => {
    const pages = []
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 4) pages.push('...')
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (current < total - 3) pages.push('...')
      pages.push(total)
    }
    return pages
  }

  const buildFilterSummary = () => {
    const parts = []
    if (filterTypeId) {
      const t = leadTypes.find(x => x.value === filterTypeId)
      if (t) parts.push(`Type: ${t.label}`)
    }
    if (filterStatusId) {
      const s = leadStatuses.find(x => x.value === filterStatusId)
      if (s) parts.push(`Status: ${s.label}`)
    }
    if (filterDesignation) parts.push(`Designation: ${filterDesignation}`)
    if (filterState) parts.push(`State: ${filterState}`)
    if (fromDate || toDate) parts.push(`Date: ${fromDate || '...'} to ${toDate || '...'}`)
    if (searchTerm.trim()) parts.push(`Search: ${searchTerm}`)
    return parts.length ? parts.join(' | ') : 'All Leads'
  }

  const handleSendEmailReport = async () => {
    if (!emailAddress.trim()) {
      alert('Please enter an email address')
      return
    }
    try {
      setSendingEmail(true)
      const cid = companyId
      if (!cid) return

      const params = {}
      if (isSuperAdmin && filterUserId) params.user_id = filterUserId
      if (filterTypeId) params.type_id = filterTypeId
      if (filterStatusId) params.status_id = filterStatusId
      if (filterDesignation) params.designation = filterDesignation
      if (filterState) params.state = filterState
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (searchTerm.trim()) params.search = searchTerm

      const response = await crmInstance.post(`/reports/leads/email-report/${cid}`, {
        ...params,
        email: emailAddress.trim(),
        subject: emailSubject.trim(),
        message: emailMessage.trim()
      })

      if (response.data.status || response.data.success) {
        alert('Report sent successfully!')
        setShowEmailModal(false)
      } else {
        alert(response.data.message || 'Failed to send report')
      }
    } catch (error) {
      console.error('Error sending email report:', error)
      alert(error.response?.data?.message || 'Error sending report')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleOpenEmailModal = () => {
    setEmailSubject(`Leads Report - ${buildFilterSummary()} - ${formatDate(new Date())}`)
    setEmailAddress('')
    setEmailMessage('Hi,\n\nPlease find attached the leads report you requested.\n\nRegards,\nTeam')
    setShowEmailModal(true)
  }

  const exportLeadsToCSV = async () => {
    try {
      const cid = companyId
      if (!cid) return

      const params = {}
      if (isSuperAdmin && filterUserId) params.user_id = filterUserId
      if (filterTypeId) params.type_id = filterTypeId
      if (filterStatusId) params.status_id = filterStatusId
      if (filterDesignation) params.designation = filterDesignation
      if (filterState) params.state = filterState
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (searchTerm.trim()) params.search = searchTerm

      const response = await crmInstance.get(`/reports/leads/masterfilter/${cid}`, { params: { ...params, per_page: 10000 } })
      if (response.data.status) {
        const allLeads = response.data.data.data
        if (allLeads.length === 0) {
          alert('No leads to export')
          return
        }
        const headers = [
          'S.No', 'User', 'Status', 'Source', 'Company Name', 'Client Name',
          'Phone No', 'Email', 'Website', 'Provider Types', 'Service',
          'State', 'Designation', 'Note', 'Next Follow-up', 'Lead Age', 'Last Updated', 'Created'
        ]
        const csvRows = allLeads.map((lead, index) => [
          index + 1,
          lead.assigned_to?.name || 'N/A',
          lead.lead_status?.name || 'N/A',
          lead.source || 'N/A',
          lead.company || 'N/A',
          lead.client_name || 'N/A',
          lead.phone || 'N/A',
          lead.email || 'N/A',
          lead.website || 'N/A',
          lead.lead_type?.name || 'N/A',
          Array.isArray(lead.service) ? lead.service.join(', ') : lead.service || 'N/A',
          lead.state || 'N/A',
          lead.designation || 'N/A',
          lead.description || 'N/A',
          fmtFuDate(getNextFollowupDate(lead)) || 'N/A',
          getLeadAge(lead.created_at),
          new Date(lead.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' }),
          new Date(lead.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' })
        ])
        const csvContent = [headers, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `leads_report_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error exporting leads:', error)
      alert('Error exporting leads')
    }
  }

  const avatarColors = ['#0DCAF0', '#534AB7', '#1D9E75', '#D85A30', '#D4537E', '#BA7517', '#185FA5', '#993556', '#3B6D11']

  const getAvatarColor = (name) => {
    if (!name) return avatarColors[0]
    const idx = name.charCodeAt(0) % avatarColors.length
    return avatarColors[idx]
  }

  // ── NEW: row-selection checkboxes — purely local UI state, does not
  // affect fetchLeads, filters, export, or email report in any way ──
  const allVisibleSelected = sortedLeads.length > 0 && sortedLeads.every(l => selectedRowIds.has(l.id))

  const toggleSelectAll = () => {
    setSelectedRowIds(prev => {
      if (allVisibleSelected) return new Set()
      return new Set(sortedLeads.map(l => l.id))
    })
  }

  const toggleSelectRow = (id) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── footer "X to Y" range display ──
  const rangeStart = totalRecords === 0 ? 0 : (currentPage - 1) * perPage + 1
  const rangeEnd = Math.min(currentPage * perPage, totalRecords)

  return (
    <PermissionGuard permission="view-leads-report">
      <PageHeader>
        <div className="lr-page-header-right page-header-right-items-wrapper">
          {isSuperAdmin && (
            <button className="lr-export-btn" onClick={exportLeadsToCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Data
            </button>
          )}

          <button className="lr-export-btn lr-email-btn" onClick={handleOpenEmailModal}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email Report
          </button>
          <h3 className="lr-page-title page-title">Total Leads</h3>
          <span className="lr-badge-leads">{totalRecords}</span>
          <span className="lr-page-info">Page {currentPage} of {totalPages}</span>
        </div>
      </PageHeader>

      <div className="main-content">

        <div className="lr-status-grid">
          {filteredStatusCounts.map((item, index) => {
            const style = getStatusStyle(item.status)
            return (
              <div
                key={index}
                className="lr-status-card"
                style={{ background: style.bg, borderLeft: `3px solid ${style.dot}` }}
              >
                <span className="lr-status-card-label" style={{ color: style.color }}>{item.status}</span>
                <span className="lr-status-card-count" style={{ color: style.dot }}>{item.count}</span>
              </div>
            )
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="lr-toolbar">
          <div className="lr-toolbar-left">
            <button
              type="button"
              className="lr-toolbar-btn"
              onClick={() => router.back()}
              title="Go back"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
            <div className="lr-toolbar-divider" />
            <button
              type="button"
              className={`lr-toolbar-btn ${sidebarOpen ? 'lr-active' : ''}`}
              onClick={() => setSidebarOpen(o => !o)}
            >
              <FiFilter size={14} />
              Filter
            </button>
            <div className="lr-toolbar-divider" />
            <span className="lr-page-info">{selectedRowIds.size > 0 ? `${selectedRowIds.size} selected` : buildFilterSummary()}</span>
          </div>

          <div className="lr-toolbar-right">
            <div className="lr-toolbar-search-wrap">
              <span className="lr-toolbar-search-icon"><FiSearch size={14} /></span>
              <input
                type="text"
                className="lr-toolbar-search-input"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <span className="lr-toolbar-perpage-label">Entries per page</span>
            <div className="lr-toolbar-perpage-select">
              <SelectDropdown
                options={entriesPerPageOptions}
                selectedOption={entriesPerPageOptions.find(o => o.value === String(perPage)) || entriesPerPageOptions[0]}
                defaultSelect={entriesPerPageOptions[0]}
                onSelectOption={(option) => setPerPage(parseInt(option.value, 10) || 10)}
              />
            </div>
          </div>
        </div>

        <div className="lr-layout">

          {/* ── Sidebar filter panel ── */}
          <div className={`lr-sidebar ${sidebarOpen ? '' : 'lr-hidden'}`}>
            <h4 className="lr-sidebar-title">Filter Leads by</h4>
            {isSuperAdmin && (
              <div className="lr-filter-group">
                <label className="lr-filter-label">Filter by User</label>
                <SelectDropdown
                  options={[{ value: '', label: 'All users' }, ...users]}
                  selectedOption={users.find(u => u.value === filterUserId) || { value: '', label: 'All users' }}
                  defaultSelect={{ value: '', label: 'All users' }}
                  onSelectOption={(option) => setFilterUserId(option.value)}
                />
              </div>
            )}

            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by Type</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select Type' }, ...leadTypes]}
                selectedOption={leadTypes.find(t => t.value === filterTypeId) || { value: '', label: 'Select Type' }}
                defaultSelect={{ value: '', label: 'Select Type' }}
                onSelectOption={(option) => {
                  urlParamsRef.current.typeId = ''
                  setFilterTypeId(option.value)
                }}
              />
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by Status</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select Status' }, ...leadStatuses]}
                selectedOption={leadStatuses.find(s => s.value === filterStatusId) || { value: '', label: 'Select Status' }}
                defaultSelect={{ value: '', label: 'Select Status' }}
                onSelectOption={(option) => {
                  urlParamsRef.current.statusId = ''
                  setFilterStatusId(option.value)
                }}
              />
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by Designation</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select Designation' }, ...designations.map(d => ({ value: d, label: d }))]}
                selectedOption={designations.find(d => d === filterDesignation) ? { value: filterDesignation, label: filterDesignation } : { value: '', label: 'Select Designation' }}
                defaultSelect={{ value: '', label: 'Select Designation' }}
                onSelectOption={(option) => setFilterDesignation(option.value)}
              />
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by State</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select State' }, ...states.map(s => ({ value: s, label: s }))]}
                selectedOption={states.find(s => s === filterState) ? { value: filterState, label: filterState } : { value: '', label: 'Select State' }}
                defaultSelect={{ value: '', label: 'Select State' }}
                onSelectOption={(option) => setFilterState(option.value)}
              />
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Date Range</label>
              <div className="lr-filter-row-2">
                <input
                  type="date"
                  className="lr-filter-input"
                  value={fromDate}
                  onChange={(e) => {
                    urlParamsRef.current.year = ''
                    urlParamsRef.current.month = ''
                    setFromDate(e.target.value)
                  }}
                />
                <input
                  type="date"
                  className="lr-filter-input"
                  value={toDate}
                  onChange={(e) => {
                    urlParamsRef.current.year = ''
                    urlParamsRef.current.month = ''
                    setToDate(e.target.value)
                  }}
                />
              </div>
            </div>



            <button
              className="lr-sidebar-reset-btn"
              type="button"
              onClick={() => {
                urlParamsRef.current = { typeId: '', statusId: '', year: '', month: '' }
                if (isSuperAdmin) setFilterUserId('')
                setFilterStatusId('')
                setFilterTypeId('')
                setFilterState('')
                setFilterDesignation('')
                setFromDate('')
                setToDate('')
                setSearchTerm('')
                setPerPage(10)
                setCurrentPage(1)
                setSelectedRowIds(new Set())
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
              </svg>
              Reset Filters
            </button>
          </div>

          {/* ── Table ── */}
          <div className="lr-content">
            <div className="lr-table-card">

              <div className="lr-table-wrap">
                <table className="lr-table">
                  <thead className="lr-thead">
                    <tr>
                      <th className="lr-th-checkbox">
                        <input
                          type="checkbox"
                          className="lr-checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="lr-th">S.no</th>
                      <th className="lr-th">
                        <span className="lr-th-sortable">User <FiChevronDown size={12} /></span>
                      </th>
                      <th className="lr-th">Status</th>
                      <th className="lr-th">Source</th>
                      <th className="lr-th">Company Name</th>
                      <th className="lr-th">Client Name</th>
                      <th className="lr-th">Phone No</th>
                      <th className="lr-th">Email</th>
                      <th className="lr-th">Website</th>
                      <th className="lr-th">Provider Types</th>
                      <th className="lr-th">State</th>
                      <th className="lr-th">Designation</th>
                      <th className="lr-th">
                        <span className="lr-th-sortable">Next Follow-up <FiChevronUp size={12} /></span>
                      </th>
                      <th className="lr-th">Lead Age</th>
                      <th className="lr-th">Last Updated</th>
                      <th className="lr-th">Created</th>
                      <th className="lr-th lr-th-right lr-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="18" className="lr-td lr-td-loading">
                          <div className="lr-loading-state">
                            <div className="spinner-border spinner-border-sm" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <span style={{ fontSize: '13px' }}>Loading leads...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="18" className="lr-td lr-td-empty">
                          <div className="lr-empty-state">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span style={{ fontSize: '13px' }}>No leads found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedLeads.map((lead, index) => {
                        const statusStyle = getStatusStyle(lead.lead_status?.name)
                        const leadAge = getLeadAge(lead.created_at)
                        const nextFu = fmtFuDate(getNextFollowupDate(lead))
                        const isChecked = selectedRowIds.has(lead.id)

                        return (
                          <tr key={lead.id} className="lr-row">
                            <td className="lr-td-checkbox">
                              <input
                                type="checkbox"
                                className="lr-checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectRow(lead.id)}
                              />
                            </td>

                            <td className="lr-td-sno">{index + 1}</td>

                            <td className="lr-td">
                              <div className="lr-avatar-cell">
                                <div className="lr-avatar" style={{ background: getAvatarColor(lead.assigned_to?.name) }}>
                                  {lead.assigned_to?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <a href="#" className="lr-link" title={lead.assigned_to?.name || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.assigned_to?.name || 'N/A'}
                                </a>
                              </div>
                            </td>

                            <td className="lr-td">
                              <span
                                className="lr-status-pill"
                                style={{ background: statusStyle.bg, color: statusStyle.color }}
                                onClick={() => handleOpenView(lead.id)}
                              >
                                {lead.lead_status?.name || 'N/A'}
                              </span>
                            </td>

                            <td className="lr-td">
                              <a href="#" className="lr-link" title={lead.source || 'N/A'}
                                onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                {lead.source || 'N/A'}
                              </a>
                            </td>

                            <td className="lr-td">
                              <a href="#" className="lr-link" title={lead.company || 'N/A'}
                                onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                {lead.company || 'N/A'}
                              </a>
                            </td>

                            <td className="lr-td">
                              <div className="lr-avatar-cell">
                                {/* <div className="lr-avatar" style={{ background: getAvatarColor(lead.client_name) }}>
                                  {lead.client_name?.charAt(0)?.toUpperCase() || 'C'}
                                </div> */}
                                <a href="#" className="lr-link" title={lead.client_name || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.client_name || 'N/A'}
                                </a>
                              </div>
                            </td>

                            <td className="lr-td">
                              <a href="#" className="lr-link" title={cleanNumberDisplay(lead.phone) || 'N/A'}
                                onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                {cleanNumberDisplay(lead.phone) || 'N/A'}


                              </a>
                            </td>

                            <td className="lr-td">
                              <a href="#" className="lr-link" title={lead.email || 'N/A'}
                                onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                {lead.email || 'N/A'}
                              </a>
                            </td>

                            <td className="lr-td">
                              <a href="#" className="lr-link" title={lead.website || 'N/A'}
                                onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                {lead.website || 'N/A'}
                              </a>
                            </td>

                            <td className="lr-td">{lead.lead_type?.name || 'N/A'}</td>
                            <td className="lr-td">{lead.state || 'N/A'}</td>
                            <td className="lr-td">{lead.designation || 'N/A'}</td>

                            <td className="lr-td">
                              {nextFu ? (
                                <span className="lr-fu-badge">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {nextFu}
                                </span>
                              ) : (
                                <span className="lr-fu-empty">—</span>
                              )}
                            </td>

                            <td className="lr-td">
                              <span className="lr-age-badge">
                                <span className="lr-age-dot" style={{ background: leadAge === 'Today' ? '#0F6E56' : '#adb5bd' }}></span>
                                {leadAge}
                              </span>
                            </td>

                            <td className="lr-td">{new Date(lead.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' })}</td>
                            <td className="lr-td">{new Date(lead.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' })}</td>

                            <td className="lr-td lr-td-actions">
                              <div className="lr-action-cell">
                                <div className="lr-action-btn" title="View Lead" onClick={() => handleOpenView(lead.id)}>  <FiEye size={14} />
                                </div>

                                <div className="lr-action-btn" title="Edit Lead" onClick={() => handleOpenEdit(lead.id)}>
                                  <FiEdit2 size={14} />
                                </div>

                                <div
                                  className="lr-action-btn"
                                  title="View History"
                                  onClick={() => {
                                    const cid = companyId ? JSON.parse(companyId) : null
                                    if (!cid) return
                                    router.push(`/leads/history/${encryptId(cid)}/${encryptId(lead.id)}`)
                                  }}
                                >
                                  <FiClock size={14} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Footer: Total Records + pagination (Zoho style) ── */}
              <div className="lr-footer-bar">
                <div className="lr-footer-total">
                  Total Records <strong>{totalRecords}</strong>
                </div>

                {totalPages > 1 && (
                  <div className="lr-pagination">
                    <span className="lr-pg-range">{rangeStart} to {rangeEnd}</span>
                    <button
                      className="lr-pg-btn"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Prev
                    </button>
                    {getVisiblePages(currentPage, totalPages).map((p, index) => (
                      p === '...' ? (
                        <span key={index} className="lr-pg-ellipsis">...</span>
                      ) : (
                        <button
                          key={index}
                          className={`lr-pg-btn ${currentPage === p ? 'lr-pg-active' : ''}`}
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      )
                    ))}
                    <button
                      className="lr-pg-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {showViewModal && (
        <LeadViewModal
          show={showViewModal}
          leadId={viewLeadId}
          onClose={handleCloseView}
          onStatusUpdated={() => fetchLeads(currentPage)}
        />
      )}

      {showEditModal && (
        <LeadEditModal
          leadId={editLeadId}
          onClose={handleCloseEdit}
          onUpdated={() => fetchLeads(currentPage)}
        />
      )}

      {showEmailModal && (
        <div className="lr-modal-overlay" onClick={() => !sendingEmail && setShowEmailModal(false)}>
          <div className="lr-modal-box" onClick={(e) => e.stopPropagation()}>
            <h5 className="lr-modal-title">Email Leads Report</h5>

            <label className="lr-filter-label">Recipient Email</label>
            <input
              type="email"
              className="lr-filter-input"
              style={{ marginBottom: '12px' }}
              placeholder="someone@example.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />

            <label className="lr-filter-label">Subject</label>
            <input
              type="text"
              className="lr-filter-input"
              style={{ marginBottom: '16px' }}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />

            <label className="lr-filter-label">Message</label>
            <textarea
              className="lr-filter-input lr-modal-textarea"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
            />

            <div className="lr-modal-filter-summary">
              Applied filters: {buildFilterSummary()}
            </div>

            <div className="lr-modal-actions">
              <button
                className="lr-modal-cancel-btn"
                onClick={() => setShowEmailModal(false)}
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                className="lr-export-btn lr-email-btn"
                style={{ opacity: sendingEmail ? 0.6 : 1 }}
                onClick={handleSendEmailReport}
                disabled={sendingEmail}
              >
                {sendingEmail ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </PermissionGuard>
  )
}

export default page