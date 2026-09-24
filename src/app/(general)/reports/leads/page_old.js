'use client'
import Footer from '@/components/shared/Footer'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import SelectDropdown from '@/components/shared/SelectDropdown'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FiEye, FiClock, FiEdit2 } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { encryptId, decryptId } from '@/utils/encryptId';
import { formatDate } from '@/utils/formatDate'
import dynamic from 'next/dynamic'

// ── NEW: View / Edit popups, loaded only when first opened ──
const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })

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

  // ── entries-per-page control ──
  const [perPage, setPerPage] = useState(10)
  const entriesPerPageOptions = [
    { value: '10',   label: '10 per page'   },
    { value: '25',   label: '25 per page'   },
    { value: '50',   label: '50 per page'   },
    { value: '100',  label: '100 per page'  },
    { value: '500',  label: '500 per page'  },
    { value: '1000', label: '1000 per page' },
  ]

  // ── View / Edit popup state ──
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewLeadId, setViewLeadId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLeadId, setEditLeadId] = useState(null)

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
      const encryptedTypeId   = params.get('lead_type_id')
      const encryptedStatusId = params.get('lead_status_id')
      const yearParam         = params.get('year')
      const monthParam        = params.get('month')

      let resolvedTypeId   = ''
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
        typeId:   resolvedTypeId,
        statusId: resolvedStatusId,
        year:     yearParam  || '',
        month:    monthParam || '',
      }

      if (resolvedTypeId && resolvedTypeId !== 'NULL')   setFilterTypeId(resolvedTypeId)
      if (resolvedStatusId && resolvedStatusId !== 'NULL') setFilterStatusId(resolvedStatusId)

      if (yearParam && monthParam) {
        const year  = parseInt(yearParam)
        const month = parseInt(monthParam) - 1
        const startDate = new Date(year, month, 1)
        const endDate   = new Date(year, month + 1, 0)
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

      const refTypeId   = urlParamsRef.current.typeId
      const refStatusId = urlParamsRef.current.statusId
      const refYear     = urlParamsRef.current.year
      const refMonth    = urlParamsRef.current.month

      const activeTypeId   = filterTypeId   || refTypeId
      const activeStatusId = filterStatusId || refStatusId

      if (activeTypeId && activeTypeId !== 'NULL')   params.type_id   = activeTypeId
      if (activeTypeId === 'NULL')                   params.type_id   = 'NULL'
      if (activeStatusId && activeStatusId !== 'NULL') params.status_id = activeStatusId
      if (activeStatusId === 'NULL')                 params.status_id = 'NULL'

      if (filterDesignation) params.designation = filterDesignation
      if (filterState)       params.state       = filterState

      const activeYear  = refYear
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
        if (toDate)   params.to_date   = toDate
      }

      const response = await crmInstance.get(`/reports/leads/masterfilter/${cid}`, { params })

      if (response.data.status) {
        const paginationData = response.data.data
        const newData = paginationData.data
        setLeads(newData)
        setTotalPages(paginationData.last_page)
        setCurrentPage(paginationData.current_page)
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

// 👇 NEW — dynamic status color palette (jitne bhi statuses aayein, sabko consistent unique color)
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

  /* ─── inline styles (scoped to this page) ─── */
  const S = {
    pageHeaderRight: {
      display: 'flex', alignItems: 'center', gap: '10px'
    },
    pageTitle: {
      fontSize: '16px', fontWeight: 500, margin: 0, color: 'inherit'
    },
    badgeLeads: {
      background: '#0DCAF0', color: '#fff',
      fontSize: '12px', fontWeight: 500,
      padding: '3px 10px', borderRadius: '20px'
    },
    pageInfo: {
      fontSize: '12px', color: '#6c757d'
    },
    exportBtn: {
      background: '#0DCAF0', color: '#fff', border: 'none',
      padding: '7px 16px', borderRadius: '8px',
      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '6px', height: '37px'
    },

    statusGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '10px', marginBottom: '18px'
    },
    statusCard: (style) => ({
      background: style.bg,
      borderRadius: '10px',
      padding: '12px 14px',
      borderLeft: `3px solid ${style.dot}`,
      display: 'flex', flexDirection: 'column', gap: '4px'
    }),
    statusCardLabel: (style) => ({
      fontSize: '11px', fontWeight: 500, color: style.color
    }),
    statusCardCount: (style) => ({
      fontSize: '22px', fontWeight: 500, color: style.dot, lineHeight: 1
    }),

    filterCard: {
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.1)',
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '18px'
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
      gap: '12px', alignItems: 'end'
    },
    filterLabel: {
      fontSize: '12px', fontWeight: 500,
      color: '#6c757d', marginBottom: '4px', display: 'block'
    },
    filterInput: {
      height: '34px', padding: '0 10px',
      border: '0.5px solid rgba(0,0,0,0.18)',
      borderRadius: '8px', fontSize: '13px',
      width: '100%', background: '#f8f9fa', color: '#212529',
      outline: 'none'
    },
    resetBtn: {
      height: '34px', padding: '0 14px',
      background: '#fff0f0', color: '#A32D2D',
      border: '0.5px solid #F7C1C1', borderRadius: '8px',
      fontSize: '12px', fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
    },

    tableCard: {
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.1)',
      borderRadius: '10px',
      overflow: 'hidden'
    },
    tableWrap: { overflowX: 'auto' },
    thead: { background: '#f8f9fa' },
    th: {
      padding: '10px 12px', textAlign: 'left',
      fontSize: '11px', fontWeight: 600, color: '#6c757d',
      borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px'
    },
    td: {
      padding: '10px 12px', fontSize: '13px',
      color: '#212529', verticalAlign: 'middle',
      borderBottom: '0.5px solid rgba(0,0,0,0.06)'
    },
    tdSno: {
      padding: '10px 12px', fontSize: '12px',
      color: '#6c757d', verticalAlign: 'middle',
      borderBottom: '0.5px solid rgba(0,0,0,0.06)'
    },

    avatarCell: { display: 'flex', alignItems: 'center', gap: '8px' },
    avatar: (bg) => ({
      width: '30px', height: '30px', borderRadius: '50%',
      background: bg || '#0DCAF0', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', fontWeight: 500, flexShrink: 0
    }),

    statusPill: (style) => ({
      display: 'inline-block', padding: '3px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 500,
      background: style.bg, color: style.color,
      whiteSpace: 'nowrap', cursor: 'pointer'
    }),

    // ── NEW: Next Follow-up date pill ──
    fuBadge: {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: 600, color: '#d97706',
      background: 'rgba(245,158,11,0.1)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: '7px', padding: '3px 8px', whiteSpace: 'nowrap'
    },

    actionCell: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' },
    actionBtn: {
      width: '28px', height: '28px', borderRadius: '7px',
      border: '0.5px solid rgba(0,0,0,0.12)',
      background: '#f8f9fa', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: '#6c757d',
      transition: 'all 0.15s'
    },

    paginationWrap: {
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '4px', padding: '14px'
    },
    pgBtn: (active, disabled) => ({
      minWidth: '30px', height: '30px', padding: '0 8px',
      borderRadius: '7px',
      border: active ? 'none' : '0.5px solid rgba(0,0,0,0.12)',
      background: active ? '#0DCAF0' : '#fff',
      color: active ? '#fff' : '#6c757d',
      fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: active ? 500 : 400
    }),

    link: {
      color: '#0aa8cc', textDecoration: 'none', fontSize: '13px', cursor: 'pointer'
    },
    ageBadge: {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '12px', color: '#6c757d'
    },
    ageDot: (color) => ({
      width: '6px', height: '6px', borderRadius: '50%',
      background: color || '#adb5bd', flexShrink: 0
    }),

    avatarColors: ['#0DCAF0','#534AB7','#1D9E75','#D85A30','#D4537E','#BA7517','#185FA5','#993556','#3B6D11']
  }

  const getAvatarColor = (name) => {
    if (!name) return S.avatarColors[0]
    const idx = name.charCodeAt(0) % S.avatarColors.length
    return S.avatarColors[idx]
  }

  return (
    <PermissionGuard permission="view-leads-report">
      <PageHeader>
        <div style={S.pageHeaderRight} className="page-header-right-items-wrapper">
         {isSuperAdmin && (
  <button style={S.exportBtn} onClick={exportLeadsToCSV}>
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    Export Data
  </button>
)}

<button style={{ ...S.exportBtn, background: '#534AB7' }} onClick={handleOpenEmailModal}>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
  Email Report
</button>
          <h3 style={S.pageTitle} className="page-title">Total Leads</h3>
          <span style={S.badgeLeads}>{filteredLeads.length} Leads</span>
          <span style={S.pageInfo}>Page {currentPage} of {totalPages}</span>
        </div>
      </PageHeader>

      <div className="main-content">

        <div style={S.statusGrid}>
          {filteredStatusCounts.map((item, index) => {
            const style = getStatusStyle(item.status)
            return (
              <div key={index} style={S.statusCard(style)}>
                <span style={S.statusCardLabel(style)}>{item.status}</span>
                <span style={S.statusCardCount(style)}>{item.count}</span>
              </div>
            )
          })}
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div style={S.tableCard}>
              <div className="card-body">

                {/* ── Filters ── */}
                <div style={{ ...S.filterCard, margin: '0 0 18px' }}>
                  <div style={S.filterGrid}>

                    {isSuperAdmin && (
                      <div>
                        <label style={S.filterLabel}>Filter by User</label>
                        <SelectDropdown
                          options={[{ value: '', label: 'All users' }, ...users]}
                          selectedOption={users.find(u => u.value === filterUserId) || { value: '', label: 'All users' }}
                          defaultSelect={{ value: '', label: 'All users' }}
                          onSelectOption={(option) => setFilterUserId(option.value)}
                        />
                      </div>
                    )}

                    <div>
                      <label style={S.filterLabel}>Filter by Type</label>
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

                    <div>
                      <label style={S.filterLabel}>Filter by Status</label>
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

                    <div>
                      <label style={S.filterLabel}>Filter by Designation</label>
                      <SelectDropdown
                        options={[{ value: '', label: 'Select Designation' }, ...designations.map(d => ({ value: d, label: d }))]}
                        selectedOption={designations.find(d => d === filterDesignation) ? { value: filterDesignation, label: filterDesignation } : { value: '', label: 'Select Designation' }}
                        defaultSelect={{ value: '', label: 'Select Designation' }}
                        onSelectOption={(option) => setFilterDesignation(option.value)}
                      />
                    </div>

                    <div>
                      <label style={S.filterLabel}>Filter by State</label>
                      <SelectDropdown
                        options={[{ value: '', label: 'Select State' }, ...states.map(s => ({ value: s, label: s }))]}
                        selectedOption={states.find(s => s === filterState) ? { value: filterState, label: filterState } : { value: '', label: 'Select State' }}
                        defaultSelect={{ value: '', label: 'Select State' }}
                        onSelectOption={(option) => setFilterState(option.value)}
                      />
                    </div>

                    <div>
                      <label style={S.filterLabel}>From Date</label>
                      <input
                        type="date"
                        style={S.filterInput}
                        value={fromDate}
                        onChange={(e) => {
                          urlParamsRef.current.year = ''
                          urlParamsRef.current.month = ''
                          setFromDate(e.target.value)
                        }}
                      />
                    </div>

                    <div>
                      <label style={S.filterLabel}>To Date</label>
                      <input
                        type="date"
                        style={S.filterInput}
                        value={toDate}
                        onChange={(e) => {
                          urlParamsRef.current.year = ''
                          urlParamsRef.current.month = ''
                          setToDate(e.target.value)
                        }}
                      />
                    </div>

                    <div>
                      <label style={S.filterLabel}>Entries per page</label>
                      <SelectDropdown
                        options={entriesPerPageOptions}
                        selectedOption={entriesPerPageOptions.find(o => o.value === String(perPage)) || entriesPerPageOptions[0]}
                        defaultSelect={entriesPerPageOptions[0]}
                        onSelectOption={(option) => setPerPage(parseInt(option.value, 10) || 10)}
                      />
                    </div>

                    <div>
                      <label style={S.filterLabel}>Search</label>
                      <input
                        type="text"
                        style={S.filterInput}
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ ...S.filterLabel, visibility: 'hidden' }}>Reset</label>
                      <button
                        style={S.resetBtn}
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
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10"/>
                          <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                        </svg>
                        Reset Filters
                      </button>
                    </div>

                  </div>
                </div>

                {/* ── Table ── */}
                <div style={S.tableWrap}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={S.thead}>
                      <tr>
                        <th style={S.th}>S.no</th>
                        <th style={S.th}>User</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Source</th>
                        <th style={S.th}>Company Name</th>
                        <th style={S.th}>Client Name</th>
                        <th style={S.th}>Phone No</th>
                        <th style={S.th}>Email</th>
                        <th style={S.th}>Website</th>
                        <th style={S.th}>Provider Types</th>
                        <th style={S.th}>State</th>
                        <th style={S.th}>Designation</th>
                        <th style={S.th}>Next Follow-up</th>
                        <th style={S.th}>Lead Age</th>
                        <th style={S.th}>Last Updated</th>
                        <th style={S.th}>Created</th>
                        <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="17" style={{ ...S.td, textAlign: 'center', padding: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: '#6c757d' }}>
                              <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              <span style={{ fontSize: '13px' }}>Loading leads...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan="17" style={{ ...S.td, textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
                          const isEven = index % 2 === 0
                          const rowBg = isEven ? '#e8f9fd' : '#f5f5f5'
                          const rowHoverBg = isEven ? '#cdf1f9' : '#e9e9e9'
                          const rowTextColor = isEven ? '#0c5460' : '#3d3d3d'
                          const rowLinkColor = isEven ? '#0a8a9f' : '#555555'
                          const rowMutedColor = isEven ? '#0c7a8a' : '#6c757d'
                          const rowActionBg = isEven ? '#d0f1f8' : '#e8e8e8'
                          const rowActionBorder = isEven ? 'rgba(13,202,240,0.3)' : 'rgba(0,0,0,0.12)'

                          const tdStyle = { ...S.td, color: rowTextColor }
                          const tdSnoStyle = { ...S.tdSno, color: rowMutedColor }
                          const linkStyle = { ...S.link, color: rowLinkColor }
                          const actionBtnStyle = {
                            ...S.actionBtn,
                            background: rowActionBg,
                            borderColor: rowActionBorder,
                            color: rowMutedColor
                          }

                          return (
                            <tr key={lead.id}
                              style={{ cursor: 'default', background: rowBg }}
                              onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                              onMouseLeave={e => e.currentTarget.style.background = rowBg}
                            >
                              <td style={tdSnoStyle}>{index + 1}</td>

                              <td style={tdStyle}>
                                <div style={S.avatarCell}>
                                  <div style={S.avatar(getAvatarColor(lead.assigned_to?.name))}>
                                    {lead.assigned_to?.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                  <a href="#" style={linkStyle} title={lead.assigned_to?.name || 'N/A'}
                                    onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                    {lead.assigned_to?.name || 'N/A'}
                                  </a>
                                </div>
                              </td>

                              <td style={tdStyle}>
                                <span style={S.statusPill(statusStyle)}
                                  onClick={() => handleOpenView(lead.id)}>
                                  {lead.lead_status?.name || 'N/A'}
                                </span>
                              </td>

                              <td style={tdStyle}>
                                <a href="#" style={linkStyle} title={lead.source || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.source || 'N/A'}
                                </a>
                              </td>

                              <td style={tdStyle}>
                                <a href="#" style={linkStyle} title={lead.company || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.company || 'N/A'}
                                </a>
                              </td>

                              <td style={tdStyle}>
                                <div style={S.avatarCell}>
                                  <div style={S.avatar(getAvatarColor(lead.client_name))}>
                                    {lead.client_name?.charAt(0)?.toUpperCase() || 'C'}
                                  </div>
                                  <a href="#" style={linkStyle} title={lead.client_name || 'N/A'}
                                    onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                    {lead.client_name || 'N/A'}
                                  </a>
                                </div>
                              </td>

                              <td style={tdStyle}>
                                <a href="#" style={linkStyle} title={lead.phone || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.phone || 'N/A'}
                                </a>
                              </td>

                              <td style={tdStyle}>
                                <a href="#" style={linkStyle} title={lead.email || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.email || 'N/A'}
                                </a>
                              </td>

                              <td style={tdStyle}>
                                <a href="#" style={linkStyle} title={lead.website || 'N/A'}
                                  onClick={(e) => { e.preventDefault(); handleOpenView(lead.id) }}>
                                  {lead.website || 'N/A'}
                                </a>
                              </td>

                              <td style={tdStyle}>{lead.lead_type?.name || 'N/A'}</td>
                              <td style={tdStyle}>{lead.state || 'N/A'}</td>
                              <td style={tdStyle}>{lead.designation || 'N/A'}</td>

                              <td style={tdStyle}>
                                {nextFu ? (
                                  <span style={S.fuBadge}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    {nextFu}
                                  </span>
                                ) : (
                                  <span style={{ color: '#adb5bd', fontSize: '12px' }}>—</span>
                                )}
                              </td>

                              <td style={tdStyle}>
                                <span style={{ ...S.ageBadge, color: rowMutedColor }}>
                                  <span style={S.ageDot(leadAge === 'Today' ? '#0F6E56' : rowMutedColor)}></span>
                                  {leadAge}
                                </span>
                              </td>

                              <td style={tdStyle}>{new Date(lead.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' })}</td>
                              <td style={tdStyle}>{new Date(lead.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' })}</td>

                              <td style={tdStyle}>
                                <div style={S.actionCell}>
                                  <div style={actionBtnStyle} title="View Lead"
                                    onClick={() => handleOpenView(lead.id)}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#0DCAF0'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0DCAF0' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = rowActionBg; e.currentTarget.style.color = rowMutedColor; e.currentTarget.style.borderColor = rowActionBorder }}
                                  >
                                    <FiEye size={14} />
                                  </div>

                                  <div style={actionBtnStyle} title="Edit Lead"
                                    onClick={() => handleOpenEdit(lead.id)}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#0DCAF0'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0DCAF0' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = rowActionBg; e.currentTarget.style.color = rowMutedColor; e.currentTarget.style.borderColor = rowActionBorder }}
                                  >
                                    <FiEdit2 size={14} />
                                  </div>

                                  <div style={actionBtnStyle} title="View History"
                                    onClick={() => {
                                      const cid = companyId ? JSON.parse(companyId) : null
                                      if (!cid) return
                                      router.push(`/leads/history/${encryptId(cid)}/${encryptId(lead.id)}`)
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#0DCAF0'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0DCAF0' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = rowActionBg; e.currentTarget.style.color = rowMutedColor; e.currentTarget.style.borderColor = rowActionBorder }}
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

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div style={S.paginationWrap}>
                    <button
                      style={S.pgBtn(false, currentPage === 1)}
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Prev
                    </button>
                    {getVisiblePages(currentPage, totalPages).map((page, index) => (
                      page === '...' ? (
                        <span key={index} style={{ fontSize: '12px', color: '#6c757d', padding: '0 4px' }}>...</span>
                      ) : (
                        <button
                          key={index}
                          style={S.pgBtn(currentPage === page, false)}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      )
                    ))}
                    <button
                      style={S.pgBtn(false, currentPage === totalPages)}
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
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050
  }} onClick={() => !sendingEmail && setShowEmailModal(false)}>
    <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', width: '420px', maxWidth: '90%' }}
      onClick={(e) => e.stopPropagation()}>
      <h5 style={{ marginBottom: '16px' }}>Email Leads Report</h5>

      <label style={S.filterLabel}>Recipient Email</label>
      <input
        type="email"
        style={{ ...S.filterInput, marginBottom: '12px' }}
        placeholder="someone@example.com"
        value={emailAddress}
        onChange={(e) => setEmailAddress(e.target.value)}
      />

      <label style={S.filterLabel}>Subject</label>
      <input
        type="text"
        style={{ ...S.filterInput, marginBottom: '16px' }}
        value={emailSubject}
        onChange={(e) => setEmailSubject(e.target.value)}
      />
      <label style={S.filterLabel}>Message</label>
<textarea
  style={{ ...S.filterInput, height: '100px', padding: '8px 10px', resize: 'vertical', marginBottom: '12px' }}
  value={emailMessage}
  onChange={(e) => setEmailMessage(e.target.value)}
/>

      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
        Applied filters: {buildFilterSummary()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          style={{ ...S.resetBtn, background: '#f8f9fa', color: '#212529', border: '0.5px solid rgba(0,0,0,0.12)' }}
          onClick={() => setShowEmailModal(false)}
          disabled={sendingEmail}
        >
          Cancel
        </button>
        <button
          style={{ ...S.exportBtn, background: '#534AB7', opacity: sendingEmail ? 0.6 : 1 }}
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