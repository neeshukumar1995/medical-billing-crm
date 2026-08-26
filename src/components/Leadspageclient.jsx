'use client'

// ✅ OPTIMIZATION 4: Heavy UI libraries loaded dynamically (NOT in initial bundle)
// SweetAlert2 alone = ~80KB gzipped. Lazy loading it saves ~80KB on initial load.
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import { usePermissions } from '@/hooks/usePermissions'
import { encryptId, decryptId } from '@/utils/encryptId'
import { FiFilter, FiSearch } from 'react-icons/fi'
import '@/styles/leadsReport.css'

// ✅ Dynamic imports for ALL heavy components - none of these block initial render
const LeadsListHeader = dynamic(() => import('@/components/leads/LeadsListHeader'))
const LeadssTable = dynamic(() => import('@/components/leads/LeadsTable'), { ssr: false })
const SelectDropdown = dynamic(() => import('@/components/shared/SelectDropdown'))
const CustomUserDropdown = dynamic(() => import('@/components/CustomUserDropdown'))

// ✅ Modals: loaded ONLY when first opened (via state gate below)
const BulkStatusModal = dynamic(() => import('./Bulkstatusmodal'), { ssr: false })
const BulkAssignModal = dynamic(() => import('./Bulkassignmodal'), { ssr: false })

// ✅ Lead View / Edit popups — loaded ONLY when first opened, just like the
// bulk modals above. These replace the old /leads/view/[id] and /leads/edit/[id]
// page navigations with an in-place popup.
const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })

// ✅ OPTIMIZATION 5: Lazy SweetAlert2 - imported only when needed, not in bundle
const fireSwal = async (options) => {
  const { default: Swal } = await import('sweetalert2')
  return Swal.fire(options)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Decode URL param helper
function decodeParam(param) {
  if (!param || param === 'NULL') return param || ''
  return decryptId(param) || ''
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadsPageClient() {
  const { hasPermission } = usePermissions()
  const searchParams = useSearchParams()
  const router = useRouter() 

  // ✅ OPTIMIZATION 7: Derive initial filter state from searchParams (server-passed prop)
  // This replaces useSearchParams() hook which forces client-side hydration
  const initialFilters = useMemo(() => ({
    statusId: decodeParam(searchParams?.get('lead_status_id')),
    typeId: decodeParam(searchParams?.get('lead_type_id')),
    source: searchParams?.get('source') || '',
    year: searchParams?.get('year') ? parseInt(searchParams.get('year')) : '',
    month: searchParams?.get('month') ? parseInt(searchParams.get('month')) : '',
  }), [searchParams]) // Re-run when searchParams changes (e.g., navigation from dashboard)

  // ── Core data state ─────────────────────────────────────────────────────────
  // ✅ CHANGED: infinite scroll removed — replaced with classic numbered
  // pagination (Prev / 1 2 3 ... / Next). `leads` now always holds just the
  // CURRENT page's rows, never a growing/appended list. `loadingMore` /
  // `hasMore` are gone; `lastPage` / `totalRecords` / `showingFrom` /
  // `showingTo` drive the pagination footer instead.
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [showingFrom, setShowingFrom] = useState(0)
  const [showingTo, setShowingTo] = useState(0)
  const [error, setError] = useState(null)
  const [noDataMsg, setNoDataMsg] = useState(null)
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalAssigned, setTotalAssigned] = useState(0)
  const [filteredAssigned, setFilteredAssigned] = useState(0)

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedLeads, setSelectedLeads] = useState([])
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [allSelectedIds, setAllSelectedIds] = useState([])

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterStatusId, setFilterStatusId] = useState(initialFilters.statusId)
  const [filterTypeId, setFilterTypeId] = useState(initialFilters.typeId)
  const [filterState, setFilterState] = useState('')
  const [filterSource, setFilterSource] = useState(initialFilters.source)
  const [filterUserId, setFilterUserId] = useState('')
  const [filterYear, setFilterYear] = useState(initialFilters.year)
  const [filterMonth, setFilterMonth] = useState(initialFilters.month)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [searchTerm, setSearchTerm] = useState('')

  // How many leads load per page. User-selectable via the "Entries per page"
  // dropdown below. Now drives page SIZE for numbered pagination.
  const [perPage, setPerPage] = useState(10)
  const entriesPerPageOptions = [
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' },
    { value: '500', label: '500 per page' },
    { value: '1000', label: '1000 per page' },
  ]

  // ── purely visual state — sidebar toggle, does not touch data/filters ──
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Search input mirror (so the toolbar input can be controlled while the
  //     debounced `searchTerm` effect below still drives the actual fetch) ──
  const [searchInputValue, setSearchInputValue] = useState('')
  const searchInputRef = useRef('')
  const handleSearchChange = useCallback((value) => {
    searchInputRef.current = value
    setSearchInputValue(value)
  }, [])

  // ✅ Update filter states when initialFilters changes (e.g., navigation from dashboard)
  useEffect(() => {
    setFilterStatusId(initialFilters.statusId)
    setFilterTypeId(initialFilters.typeId)
    setFilterSource(initialFilters.source)
    setFilterYear(initialFilters.year)
    setFilterMonth(initialFilters.month)
  }, [initialFilters])

  // ── Metadata state (non-blocking) ────────────────────────────────────────────
  const [leadStatuses, setLeadStatuses] = useState([])
  const [leadTypes, setLeadTypes] = useState([])
  const [states, setStates] = useState([])
  const [source, setSource] = useState([])
  const [filterUsers, setFilterUsers] = useState([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // ── Bulk action state ─────────────────────────────────────────────────────────
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)
  const [bulkStatusId, setBulkStatusId] = useState('')
  const [bulkStatusNotes, setBulkStatusNotes] = useState('')
  const [bulkFollowupDate, setBulkFollowupDate] = useState('')
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [bulkAssignUserId, setBulkAssignUserId] = useState('')
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersHasMore, setUsersHasMore] = useState(true)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)

  // ── View / Edit popup state ─────────────────────────────────────────────
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewLeadId, setViewLeadId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLeadId, setEditLeadId] = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const filteringRef = useRef(false)
  const [, startTransition] = useTransition()

  // ✅ OPTIMIZATION 8: companyId read once, stable ref - no re-render on change
  const companyIdRef = useRef(
    typeof window !== 'undefined' ? localStorage.getItem('companyId') : null
  )
  const getCid = () => {
    const raw = companyIdRef.current
    return raw ? JSON.parse(raw) : null
  }

  // ── Derived values (memoized) ─────────────────────────────────────────────────
  const filteredLeadStatuses = useMemo(
    () => leadStatuses.filter(s => s.label !== 'Converted'),
    [leadStatuses]
  )

  // ─── Data fetching ───────────────────────────────────────────────────────────

  // ✅ OPTIMIZATION 10: All metadata fetched in ONE parallel Promise.all call
  useEffect(() => {
    const cid = getCid()
    if (!cid) return

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      setIsSuperAdmin(user.role === 'superadmin' || user.role === 'admin')
    } catch { }

    Promise.all([
      crmInstance.get(`/lead-status/${cid}`),
      crmInstance.get(`/lead-types/${cid}`),
      crmInstance.get(`/assigned-leads/${cid}/states`),
      crmInstance.get(`/lead-source/${cid}`),
      crmInstance.get(`/leads/counts/${cid}`),
      crmInstance.get(`/converted-leads/users/${cid}`),
    ]).then(([statusRes, typeRes, stateRes, sourceRes, countRes, usersRes]) => {
      const statusData = statusRes.data.data?.data || statusRes.data.data || []
      setLeadStatuses(Array.isArray(statusData)
        ? statusData.map(i => ({ value: String(i.id), label: String(i.name || '') }))
        : [])

      const typeData = typeRes.data.data?.data || typeRes.data.data || []
      setLeadTypes(Array.isArray(typeData)
        ? typeData.map(i => ({ value: String(i.id), label: String(i.name || '') }))
        : [])

      setStates(stateRes.data.data || [])
      setSource(sourceRes.data.data || [])

      const counts = countRes.data.data || {}
      setTotalLeads(counts.total_leads || 0)
      setTotalAssigned(counts.assigned_leads || 0)

      if (usersRes.data.success) {
        const ud = usersRes.data.data || []
        setFilterUsers(Array.isArray(ud)
          ? ud.map(u => ({
            value: String(u.value),
            label: u.label.split(' (')[0],
            avatar: u.label?.charAt(0).toUpperCase() || 'U',
          }))
          : [])
      }
    }).catch(err => console.error('Metadata fetch error:', err))
  }, []) // ← runs once on mount

  // ── Main leads fetch (memoized, stable reference) ──────────────────────────
  // ✅ CHANGED: `append` parameter removed entirely — every call now just
  // fetches and REPLACES the current page's leads. Sets pagination meta
  // (lastPage / totalRecords / showingFrom / showingTo) for the footer.
  const fetchLeads = useCallback(async (page = 1, dateFilterOverride = null) => {
    const cid = getCid()
    if (!cid) return

    try {
      setLoading(true)
      setError(null)

      const params = { page, per_page: perPage }
      if (filterTypeId) params.lead_type_id = filterTypeId
      if (filterStatusId) params.lead_status_id = filterStatusId
      if (filterState) params.state = filterState
      if (filterSource) params.source = filterSource
      if (searchTerm) params.search = searchTerm
      if (filterUserId) params.assigned_to = filterUserId
      if (filterYear) params.year = filterYear
      if (filterMonth) params.month = filterMonth

      const df = dateFilterOverride || dateFilter
      if (df.from) params.from_date = df.from
      if (df.to) params.to_date = df.to

      const response = await crmInstance.get(`/leads/${cid}/master-filter`, { params })

      if (response.data.success) {
        const pg = response.data.data
        const newLeads = pg.data || []

        setLeads(newLeads)
        setFilteredAssigned(newLeads.filter(l => l.assigned_to).length)

        const total = pg.total ?? newLeads.length
        const last = pg.last_page ?? 1
        const cur = pg.current_page ?? page

        setTotalLeads(total)
        setTotalRecords(total)
        setLastPage(last)
        setCurrentPage(cur)
        setShowingFrom(total === 0 ? 0 : (pg.from ?? ((cur - 1) * perPage + 1)))
        setShowingTo(pg.to ?? Math.min(cur * perPage, total))
        setNoDataMsg(null)
      } else {
        setLeads([])
        setNoDataMsg(response.data.message || 'No leads found')
        setTotalRecords(0)
        setLastPage(1)
        setCurrentPage(1)
        setShowingFrom(0)
        setShowingTo(0)
      }
    } catch (err) {
      console.error('Leads fetch error:', err)
      setError('Failed to load leads. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filterStatusId, filterTypeId, filterState, filterSource, searchTerm, dateFilter, filterYear, filterMonth, filterUserId, perPage])

  // ✅ Single unified filter effect — re-fetches PAGE 1 whenever a filter changes.
  useEffect(() => {
    setIsSelectAll(false)
    setAllSelectedIds([])
    setSelectedLeads([])
    setNoDataMsg(null)
    fetchLeads(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatusId, filterTypeId, filterState, filterSource, filterUserId, filterYear, filterMonth, dateFilter, perPage])

  // ── Search with debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInputRef.current !== searchTerm) {
        setSearchTerm(searchInputRef.current)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [searchInputValue]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsSelectAll(false)
    setAllSelectedIds([])
    setSelectedLeads([])
    fetchLeads(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // ── Pagination — replaces infinite scroll entirely ─────────────────────────
  // No scroll listeners anywhere. Clicking Prev / a page number / Next just
  // fetches that page directly. Scrolling the page never triggers a fetch,
  // so the table/footer never jump or "flash" mid-scroll.
  const goToPage = useCallback((page) => {
    if (page < 1 || page > lastPage || page === currentPage || loading) return
    fetchLeads(page)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [fetchLeads, lastPage, currentPage, loading])

  // Builds the [1, '...', 4, 5, 6, '...', 175] style page list for the footer
  const getPageNumbers = () => {
    const pages = []
    const delta = 1
    const range = []
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(lastPage - 1, currentPage + delta); i++) {
      range.push(i)
    }
    if (currentPage - delta > 2) range.unshift('...')
    if (currentPage + delta < lastPage - 1) range.push('...')
    pages.push(1)
    pages.push(...range)
    if (lastPage > 1) pages.push(lastPage)
    return pages
  }

  // ── Date filter ───────────────────────────────────────────────────────────────
  const handleApplyDateFilter = () => {
    if (filteringRef.current) return
    if (!fromDate || !toDate) {
      fireSwal({ title: 'Error!', text: 'Please select both From Date and To Date.', icon: 'error', confirmButtonText: 'OK' })
      return
    }
    filteringRef.current = true
    const newDF = { from: fromDate, to: toDate }
    setDateFilter(newDF)
    setError(null)
    setNoDataMsg(null)
    setIsSelectAll(false)
    setAllSelectedIds([])
    setSelectedLeads([])
    fetchLeads(1, newDF).finally(() => { filteringRef.current = false })
  }

  // ── Reset all filters ─────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setFilterStatusId('')
    setFilterTypeId('')
    setFilterState('')
    setFilterSource('')
    setFilterUserId('')
    setFromDate('')
    setToDate('')
    setDateFilter({ from: '', to: '' })
    setSearchTerm('')
    searchInputRef.current = ''
    setSearchInputValue('')
    setIsSelectAll(false)
    setAllSelectedIds([])
    setSelectedLeads([])
  }

  // ── Selection handlers ────────────────────────────────────────────────────────
  const handleSelectAll = useCallback(async () => {
    if (isSelectAll) {
      setSelectedLeads([])
      setAllSelectedIds([])
      setIsSelectAll(false)
      return
    }
    try {
      const cid = getCid()
      if (!cid) return
      const params = {
        lead_type_id: filterTypeId || undefined,
        lead_status_id: filterStatusId || undefined,
        state: filterState || undefined,
        source: filterSource || undefined,
        search: searchTerm || undefined,
        from_date: dateFilter.from || undefined,
        to_date: dateFilter.to || undefined,
        year: filterYear || undefined,
        month: filterMonth || undefined,
        assigned_to: filterUserId || undefined,
        select_all: true,
      }
      const res = await crmInstance.get(`/leads/${cid}`, { params })
      if (res.data.success) {
        const ids = res.data.data || []
        setAllSelectedIds(ids)
        setSelectedLeads(ids)
        setIsSelectAll(true)
      }
    } catch (err) {
      console.error('Select all error:', err)
      fireSwal({ title: 'Error!', text: 'Failed to select all leads.', icon: 'error', confirmButtonText: 'OK' })
    }
  }, [isSelectAll, filterTypeId, filterStatusId, filterState, filterSource, searchTerm, dateFilter, filterYear, filterMonth, filterUserId])

  const handleSelectionChange = useCallback((selectedRows) => {
    const ids = selectedRows.map(r => r.id)
    setSelectedLeads(ids)
    if (isSelectAll && ids.length !== allSelectedIds.length) {
      setIsSelectAll(false)
      setAllSelectedIds([])
    }
  }, [isSelectAll, allSelectedIds])

  // ── Handle data update (post delete/status change) ────────────────────────────
  const handleDataUpdate = useCallback((updatedData) => {
    let d = updatedData
    if (filterStatusId) d = d.filter(l => filterStatusId === 'NULL' ? !l.lead_status?.id : l.lead_status?.id?.toString() === filterStatusId)
    if (filterTypeId) d = d.filter(l => l.lead_type?.id?.toString() === filterTypeId)
    if (filterState) d = d.filter(l => l.state === filterState)
    if (filterSource) d = d.filter(l => {
      const s = typeof l.source === 'object' ? l.source?.name : l.source
      return filterSource === 'NULL' ? !s : s?.toLowerCase() === filterSource.toLowerCase()
    })
    if (filterUserId) d = d.filter(l => l.assigned_to?.id?.toString() === filterUserId)
    if (searchTerm) d = d.filter(l => {
      const t = searchTerm.toLowerCase()
      return [l.client_name, l.email, l.phone, l.company, l.lead_type?.name, l.lead_status?.name, l.assigned_to?.name].some(f => f?.toLowerCase?.().includes(t))
    })
    setLeads(d)
  }, [filterStatusId, filterTypeId, filterState, filterSource, filterUserId, searchTerm])

  // ── Bulk action (draft / delete) ──────────────────────────────────────────────
  // ✅ CHANGED: after a successful bulk action, refetch the CURRENT page
  // (instead of just filtering the in-memory array) so `totalRecords` /
  // pagination stays accurate against the server.
  const handleBulkAction = useCallback(async () => {
    if (!selectedLeads.length) return
    const cid = getCid()
    if (!cid) return

    const result = await fireSwal({
      title: 'Action Required',
      text: `What would you like to do with ${selectedLeads.length} selected lead(s)?`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: '#ffc107',
      denyButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Save to Draft',
      denyButtonText: 'Permanently Delete',
      cancelButtonText: 'Cancel',
    })

    const clearSelection = () => {
      setSelectedLeads([])
      setIsSelectAll(false)
      setAllSelectedIds([])
    }

    if (result.isConfirmed) {
      try {
        await crmInstance.post(`/leads/${cid}/bulk-draft`, { ids: selectedLeads, status: 'deleted' })
        clearSelection()
        await fireSwal({ title: 'Success!', text: `Drafted ${selectedLeads.length} lead(s)`, icon: 'success', confirmButtonText: 'OK' })
        fetchLeads(currentPage)
      } catch {
        fireSwal({ title: 'Error!', text: 'Failed to draft leads.', icon: 'error', confirmButtonText: 'OK' })
      }
    } else if (result.isDenied) {
      try {
        await crmInstance.delete(`/leads/${cid}/bulk-delete`, { data: { ids: selectedLeads } })
        clearSelection()
        await fireSwal({ title: 'Deleted!', text: `Deleted ${selectedLeads.length} lead(s)`, icon: 'success', confirmButtonText: 'OK' })
        fetchLeads(currentPage)
      } catch {
        fireSwal({ title: 'Error!', text: 'Failed to delete leads.', icon: 'error', confirmButtonText: 'OK' })
      }
    }
  }, [selectedLeads, currentPage, fetchLeads])

  // ── Bulk status ───────────────────────────────────────────────────────────────
  const handleBulkStatusSelect = useCallback((id) => {
    if (!selectedLeads.length) return
    setBulkStatusId(id)
    setBulkStatusNotes('')
    setBulkFollowupDate('')
    setShowBulkStatusModal(true)
  }, [selectedLeads])

  const handleBulkStatusUpdate = useCallback(async () => {
    if (!selectedLeads.length || !bulkStatusId) return
    const cid = getCid()
    if (!cid) return

    const selectedStatus = leadStatuses.find(s => s.value === bulkStatusId)
    if (!selectedStatus) return

    const isFollowUp = /follow up|progress/i.test(selectedStatus.label || '')

    if (isFollowUp && !bulkFollowupDate) {
      fireSwal({ title: 'Error!', text: 'Please fill the follow-up date.', icon: 'error', confirmButtonText: 'OK' })
      return
    }

    try {
      const updatePromises = selectedLeads.map(leadId => {
        const payload = {
          user_id: null,
          leads_id: leadId,
          status_id: parseInt(bulkStatusId),
          note: bulkStatusNotes || null,
          ...(isFollowUp && bulkFollowupDate ? { followup_date: bulkFollowupDate } : {}),
          ...(selectedStatus.label.toLowerCase().includes('converted') ? { selling_price: null } : {}),
        }
        return crmInstance.post(`/leads/${cid}/${leadId}/update-status-with-note`, payload)
      })

      await Promise.all(updatePromises)

      setSelectedLeads([])
      setIsSelectAll(false)
      setAllSelectedIds([])
      setShowBulkStatusModal(false)
      setBulkStatusId('')
      setBulkStatusNotes('')
      setBulkFollowupDate('')

      await fireSwal({ title: 'Success!', text: `Updated ${selectedLeads.length} lead(s)`, icon: 'success', confirmButtonText: 'OK' })
      fetchLeads(currentPage)
    } catch {
      fireSwal({ title: 'Error!', text: 'Failed to update status.', icon: 'error', confirmButtonText: 'OK' })
    }
  }, [selectedLeads, bulkStatusId, bulkStatusNotes, bulkFollowupDate, leadStatuses, fetchLeads, currentPage])

  // ── Bulk assign ───────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, append = false) => {
    const cid = getCid()
    if (!cid) return
    try {
      append ? setUsersLoadingMore(true) : setUsersLoading(true)
      const res = await crmInstance.get(`/users/${cid}`, { params: { page, per_page: 20 } })
      if (res.data.success) {
        const ud = res.data.data.data || []
        const opts = ud.map(u => ({ value: String(u.id), label: u.name, avatar: u.name.charAt(0).toUpperCase() }))
        append ? setUsers(prev => [...prev, ...opts]) : setUsers(opts)
        setUsersHasMore(res.data.data.current_page < res.data.data.last_page)
        setUsersPage(page)
      }
    } catch {
      setUsersError('Failed to load users')
    } finally {
      setUsersLoading(false)
      setUsersLoadingMore(false)
    }
  }, [])

  const handleBulkAssign = useCallback(async () => {
    if (!selectedLeads.length) return
    setBulkAssignUserId('')
    setShowBulkAssignModal(true)
    if (!users.length) fetchUsers(1, false)
  }, [selectedLeads, users.length, fetchUsers])

  const handleBulkAssignUpdate = useCallback(async () => {
    if (!selectedLeads.length || !bulkAssignUserId) return
    const cid = getCid()
    if (!cid) return
    try {
      await crmInstance.post(`/leads/bulk-assign/${cid}`, {
        lead_ids: selectedLeads,
        user_id: parseInt(bulkAssignUserId),
      })
      setSelectedLeads([])
      setIsSelectAll(false)
      setAllSelectedIds([])
      setShowBulkAssignModal(false)
      setBulkAssignUserId('')
      await fireSwal({ title: 'Success!', text: `Assigned ${selectedLeads.length} lead(s)`, icon: 'success', confirmButtonText: 'OK' })
      fetchLeads(currentPage)
    } catch {
      fireSwal({ title: 'Error!', text: 'Failed to assign leads.', icon: 'error', confirmButtonText: 'OK' })
    }
  }, [selectedLeads, bulkAssignUserId, users, fetchLeads, currentPage])

  // ── View / Edit popup handlers ──────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Filter summary string for the toolbar
  // ─────────────────────────────────────────────────────────────────────────
  const buildFilterSummary = () => {
    const parts = []
    if (filterTypeId) {
      const t = leadTypes.find(x => x.value === filterTypeId)
      if (t) parts.push(`Type: ${t.label}`)
    }
    if (filterState) parts.push(`State: ${filterState}`)
    if (filterSource) parts.push(`Source: ${filterSource === 'NULL' ? 'Unknown' : filterSource}`)
    if (filterStatusId) {
      const s = filteredLeadStatuses.find(x => x.value === filterStatusId)
      parts.push(`Status: ${filterStatusId === 'NULL' ? 'Unknown' : s?.label || filterStatusId}`)
    }
    if (filterUserId) {
      const u = filterUsers.find(x => x.value === filterUserId)
      if (u) parts.push(`User: ${u.label}`)
    }
    if (dateFilter.from || dateFilter.to) parts.push(`Date: ${dateFilter.from || '...'} to ${dateFilter.to || '...'}`)
    if (searchTerm.trim()) parts.push(`Search: ${searchTerm}`)
    return parts.length ? parts.join(' | ') : 'All Leads'
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ✅ Header with selection info */}
      <LeadsListHeader
        selectedLeads={selectedLeads}
        onBulkAction={handleBulkAction}
        totalLeads={totalLeads}
        totalAssigned={totalAssigned}
        filteredAssigned={filteredAssigned}
        hasFilter={!!(filterStatusId || filterTypeId || filterState || filterUserId || (dateFilter.from && dateFilter.to))}
      />

  
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
          <span className="lr-page-info">
            {selectedLeads.length > 0 ? `${selectedLeads.length} selected` : buildFilterSummary()}
          </span>
        </div>

        <div className="lr-toolbar-right">
          <div className="lr-toolbar-search-wrap">
            <span className="lr-toolbar-search-icon"><FiSearch size={14} /></span>
            <input
              type="text"
              className="lr-toolbar-search-input"
              placeholder="Search leads..."
              value={searchInputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <span className="lr-toolbar-perpage-label">Entries per page</span>
          <div className="lr-toolbar-perpage-select">
            <SelectDropdown
              options={entriesPerPageOptions}
              selectedOption={entriesPerPageOptions.find(o => o.value === String(perPage)) || entriesPerPageOptions[0]}
              defaultSelect={entriesPerPageOptions[0]}
              onSelectOption={(opt) => setPerPage(parseInt(opt.value, 10) || 10)}
            />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger m-3">{error}</div>}

      {/* ── Bulk action banner ── */}
      {selectedLeads.length > 0 && (
        <div
          className="d-flex align-items-center flex-wrap gap-2 mb-3 px-3 py-2 rounded"
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <span className="fw-semibold text-dark me-2">
            <i className="bi bi-check2-square me-1 text-warning"></i>
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
          </span>

          {hasPermission('Bulk-Lead-Status') && (
            <div style={{ minWidth: 200 }}>
              <SelectDropdown
                options={leadStatuses}
                defaultSelect={{ value: '', label: 'Bulk Lead Status' }}
                onSelectOption={(opt) => opt.value && handleBulkStatusSelect(opt.value)}
              />
            </div>
          )}

          {hasPermission('assign-leads') && (
            <button
              type="button"
              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
              onClick={handleBulkAssign}
            >
              Assign Selected
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm btn-secondary d-flex align-items-center gap-1"
            onClick={() => { setSelectedLeads([]); setIsSelectAll(false); setAllSelectedIds([]) }}
          >
            <i className="bi bi-x-lg"></i>
            Clear Selection
          </button>
        </div>
      )}

      {/* ✅ CHANGED: sidebar now stays mounted/visible while a page loads —
          only the table area shows the spinner, same pattern as raw-leads
          page. Previously the ENTIRE layout (including the filter sidebar)
          was replaced by a spinner on every single page-change, which felt
          like the whole screen reloading. */}
      <div className="lr-layout">

        {/* ── Sidebar filter panel ── */}
        <div className={`lr-sidebar ${sidebarOpen ? '' : 'lr-hidden'}`}>
          <h4 className="lr-sidebar-title">Filter Leads by</h4>

          {hasPermission('filter-by-lead-type') && (
            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by Type</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select Type' }, { value: 'NULL', label: 'Unknown' }, ...leadTypes]}
                selectedOption={leadTypes.find(t => t.value === filterTypeId) || (filterTypeId === 'NULL' ? { value: 'NULL', label: 'Unknown' } : { value: '', label: 'Select Type' })}
                defaultSelect={{ value: '', label: 'Select Type' }}
                onSelectOption={(opt) => setFilterTypeId(opt.value)}
              />
            </div>
          )}

          <div className="lr-filter-group">
            <label className="lr-filter-label">Filter by State</label>
            <SelectDropdown
              options={[{ value: '', label: 'Select State' }, ...states.map(s => ({ value: s, label: s }))]}
              selectedOption={filterState ? { value: filterState, label: filterState } : { value: '', label: 'Select State' }}
              defaultSelect={{ value: '', label: 'Select State' }}
              onSelectOption={(opt) => setFilterState(opt.value)}
            />
          </div>

          <div className="lr-filter-group">
            <label className="lr-filter-label">Filter by Source</label>
            <SelectDropdown
              options={[{ value: '', label: 'Select source' }, { value: 'NULL', label: 'Unknown' }, ...source.map(s => ({ value: s, label: s }))]}
              selectedOption={filterSource ? (filterSource === 'NULL' ? { value: 'NULL', label: 'Unknown' } : { value: filterSource, label: filterSource }) : { value: '', label: 'Select source' }}
              defaultSelect={{ value: '', label: 'Select source' }}
              onSelectOption={(opt) => setFilterSource(opt.value)}
            />
          </div>

          {hasPermission('filter-by-status') && (
            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by Status</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select Status' }, { value: 'NULL', label: 'Unknown' }, ...filteredLeadStatuses]}
                selectedOption={filteredLeadStatuses.find(s => s.value === filterStatusId) || (filterStatusId === 'NULL' ? { value: 'NULL', label: 'Unknown' } : { value: '', label: 'Select Status' })}
                defaultSelect={{ value: '', label: 'Select Status' }}
                onSelectOption={(opt) => setFilterStatusId(opt.value)}
              />
            </div>
          )}

          {isSuperAdmin && (
            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by User</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select User' }, ...filterUsers]}
                selectedOption={filterUsers.find(u => u.value === filterUserId) || { value: '', label: 'Select User' }}
                defaultSelect={{ value: '', label: 'Select User' }}
                onSelectOption={(opt) => setFilterUserId(opt.value)}
              />
            </div>
          )}

          {hasPermission('filter-by-date') && (
            <div className="lr-filter-group">
              <label className="lr-filter-label">Date Range</label>
              <div className="lr-filter-row-2">
                <input
                  type="date"
                  className="lr-filter-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <input
                  type="date"
                  className="lr-filter-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="lr-export-btn"
                style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                onClick={handleApplyDateFilter}
                disabled={filteringRef.current}
              >
                {filteringRef.current
                  ? <><div className="spinner-border spinner-border-sm me-2" role="status" />Filtering...</>
                  : <><i className="bi bi-funnel-fill me-2" />Apply Date Filter</>}
              </button>
            </div>
          )}

          <button
            className="lr-sidebar-reset-btn"
            type="button"
            onClick={handleResetFilters}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
            </svg>
            Reset Filters
          </button>
        </div>

        {/* ── Table area ── */}
        <div className="lr-content">
          <div className="lr-table-card">

            {loading && (
              <div className="d-flex justify-content-center align-items-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!loading && (
              <>
                {leads.length === 0 && noDataMsg ? (
                  <div className="text-center py-5">
                    <div className="text-muted">{noDataMsg}</div>
                  </div>
                ) : (
                  <LeadssTable
                    data={leads}
                    onDataUpdate={handleDataUpdate}
                    onSelectionChange={handleSelectionChange}
                    selectedRows={selectedLeads}
                    onSelectAll={handleSelectAll}
                    leadStatuses={leadStatuses}
                    allowedActions={['view', 'edit', 'history', 'delete', 'status', 'email', 'email-history', 'chat', 'call']}
                    isSelectAll={isSelectAll}
                    allSelectedIds={allSelectedIds}
                    onStatusUpdateSuccess={() => fetchLeads(currentPage)}
                    onViewLead={handleOpenView}
                    onEditLead={handleOpenEdit}
                    showEntriesInfo={false}
                    showEntriesDropdown={false}
                  />
                )}

                {/* ── Numbered pagination footer (replaces infinite scroll) ── */}
                <div className="lr-footer-bar">
                  <div className="lr-footer-total">
                    Total Records <strong>{totalRecords}</strong>
                    {totalRecords > 0 && (
                      <span className="lr-pg-range"> &nbsp;|&nbsp; Showing {showingFrom} to {showingTo}</span>
                    )}
                  </div>

                  {lastPage > 1 && (
                    <div className="lr-pagination">
                      <button
                        type="button"
                        className="lr-pg-btn"
                        disabled={currentPage === 1 || loading}
                        onClick={() => goToPage(currentPage - 1)}
                      >
                        Prev
                      </button>

                      {getPageNumbers().map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="lr-pg-ellipsis">...</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`lr-pg-btn ${p === currentPage ? 'lr-pg-active' : ''}`}
                            disabled={loading}
                            onClick={() => goToPage(p)}
                          >
                            {p}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        className="lr-pg-btn"
                        disabled={currentPage === lastPage || loading}
                        onClick={() => goToPage(currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ OPTIMIZATION 14: Modals rendered ONLY when open (dynamic import + conditional mount) */}
      {showBulkStatusModal && (
        <BulkStatusModal
          selectedCount={selectedLeads.length}
          leadStatuses={leadStatuses}
          bulkStatusId={bulkStatusId}
          setBulkStatusId={setBulkStatusId}
          bulkStatusNotes={bulkStatusNotes}
          setBulkStatusNotes={setBulkStatusNotes}
          bulkFollowupDate={bulkFollowupDate}
          setBulkFollowupDate={setBulkFollowupDate}
          onClose={() => setShowBulkStatusModal(false)}
          onSubmit={handleBulkStatusUpdate}
        />
      )}

      {showBulkAssignModal && (
        <BulkAssignModal
          selectedCount={selectedLeads.length}
          users={users}
          bulkAssignUserId={bulkAssignUserId}
          setBulkAssignUserId={setBulkAssignUserId}
          usersLoading={usersLoading}
          usersLoadingMore={usersLoadingMore}
          usersError={usersError}
          usersHasMore={usersHasMore}
          onLoadMore={() => { if (!usersLoadingMore && usersHasMore) fetchUsers(usersPage + 1, true) }}
          onClose={() => setShowBulkAssignModal(false)}
          onSubmit={handleBulkAssignUpdate}
        />
      )}

      {/* ✅ Lead View popup — mounted only while open. */}
      {showViewModal && (
        <LeadViewModal
          show={showViewModal}
          leadId={viewLeadId}
          onClose={handleCloseView}
          onStatusUpdated={() => fetchLeads(currentPage)}
        />
      )}

      {/* ✅ Lead Edit popup — mounted only while open. */}
      {showEditModal && (
        <LeadEditModal
          leadId={editLeadId}
          onClose={handleCloseEdit}
          onUpdated={() => fetchLeads(currentPage)}
        />
      )}

      {/* Backdrop */}
      {(showBulkStatusModal || showBulkAssignModal) && (
        <div className="modal-backdrop fade show" />
      )}
    </>
  )
}