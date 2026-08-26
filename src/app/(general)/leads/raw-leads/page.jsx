'use client'
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import RowLeadsHeader from '@/components/leads/RowLeadsHeader'
import LeadsTable from '@/components/leads/LeadsTable'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'
import SelectDropdown from '@/components/shared/SelectDropdown'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import dynamic from 'next/dynamic'
import { FiFilter, FiSearch, FiArrowLeft } from 'react-icons/fi'
import '@/styles/leadsReport.css'

const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })
// ─── Avatar color helper (module-level, no re-creation on render) ────────────
const AVATAR_COLORS = [
  'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger',
  'bg-secondary', 'bg-dark', 'bg-primary-soft', 'bg-success-soft',
]
const getAvatarColor = (initial) => AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthName = (m) => MONTH_NAMES[m - 1] || ''

// ─── CustomUserDropdown ───────────────────────────────────────────────────────
const CustomUserDropdown = ({ users, selectedUser, loading, loadingMore, error, hasMore, onSelect, onLoadMore }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  const filteredUsers = users.filter(u =>
    u.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight - 50 && hasMore && !loadingMore) {
      onLoadMore()
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) return <div className="form-control">Loading users...</div>
  if (error) return <div className="form-control text-danger">{error}</div>

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div
        className="form-control d-flex align-items-center justify-content-between"
        onClick={() => setIsOpen(o => !o)}
        style={{ cursor: 'pointer', minHeight: '48px' }}
      >
        <div className="d-flex align-items-center">
          {selectedUser ? (
            <>
              <div
                className={`avatar avatar-sm rounded-circle me-2 d-flex align-items-center justify-content-center ${getAvatarColor(selectedUser.avatar)}`}
                style={{ width: '32px', height: '32px' }}
              >
                <span className="text-white fw-bold" style={{ fontSize: '14px', lineHeight: '1' }}>
                  {selectedUser.avatar}
                </span>
              </div>
              <span>{selectedUser.label}</span>
            </>
          ) : (
            <span className="text-muted">Assign Selected Leads To User</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu show w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="px-3 py-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div onScroll={handleScroll} style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.value}
                className="dropdown-item d-flex align-items-center"
                onClick={() => { onSelect(user); setIsOpen(false); setSearchTerm('') }}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className={`avatar avatar-sm rounded-circle me-2 d-flex align-items-center justify-content-center ${getAvatarColor(user.avatar)}`}
                  style={{ width: '32px', height: '32px', flexShrink: 0 }}
                >
                  <span className="text-white fw-bold" style={{ fontSize: '14px', lineHeight: '1' }}>
                    {user.avatar}
                  </span>
                </div>
                <span>{user.label}</span>
              </div>
            ))}
            {loadingMore && (
              <div className="dropdown-item text-center">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading more users...
              </div>
            )}
            {!hasMore && users.length > 0 && (
              <div className="dropdown-item text-center text-muted">No more users to load</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inner page component (uses useSearchParams) ──────────────────────────────
const RawLeadsInner = () => {

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

  const searchParams = useSearchParams()
  const router = useRouter()
  const urlYear = searchParams.get('year') ? parseInt(searchParams.get('year')) : null
  const urlMonth = searchParams.get('month') ? parseInt(searchParams.get('month')) : null

  // ── Stable companyId ref — never changes, no re-renders ───────────────────
  const companyIdRef = useRef(
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('companyId') || 'null') : null
  )
  const cid = companyIdRef.current

  // ── Leads state ───────────────────────────────────────────────────────────
  // NOTE: infinite scroll removed — replaced with classic numbered pagination
  // (Prev / 1 2 3 ... / Next), like the screenshot. `leads` now always holds
  // just the CURRENT page's rows, never an appended/growing list.
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [showingFrom, setShowingFrom] = useState(0)
  const [showingTo, setShowingTo] = useState(0)
  const [error, setError] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState([])

  // ── Lookup data ───────────────────────────────────────────────────────────
  const [leadStatuses, setLeadStatuses] = useState([])
  const [leadTypes, setLeadTypes] = useState([])
  const [states, setStates] = useState([])

  // ── Users ─────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersHasMore, setUsersHasMore] = useState(true)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterState, setFilterState] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [selectedYear, setSelectedYear] = useState(urlYear)
  const [selectedMonth, setSelectedMonth] = useState(urlMonth)

  // ── entries-per-page control ──────────────────────────────────────────────
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

  // ── Counts ────────────────────────────────────────────────────────────────
  const [totalLeads, setTotalLeads] = useState(0)
  const [unassignedLeads, setUnassignedLeads] = useState(0)
  const [filteredUnassigned, setFilteredUnassigned] = useState(0)

  // ── Bulk status modal ─────────────────────────────────────────────────────
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)
  const [bulkStatusId, setBulkStatusId] = useState('')
  const [bulkStatusNotes, setBulkStatusNotes] = useState('')

  // ─────────────────────────────────────────────────────────────────────────
  // Lookup fetchers (stable — depend only on cid which never changes)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLeadStatuses = useCallback(async () => {
    if (!cid) return
    try {
      const res = await crmInstance.get(`/lead-status/${cid}`)
      const data = res.data.data.data || res.data.data || res.data || []
      setLeadStatuses(Array.isArray(data) ? data.map(i => ({ value: String(i.id), label: i.name })) : [])
    } catch (e) { console.error('Error fetching lead statuses:', e) }
  }, [cid])

  const fetchLeadTypes = useCallback(async () => {
    if (!cid) return
    try {
      const res = await crmInstance.get(`/lead-types/${cid}`)
      const data = res.data.data.data || res.data.data || res.data || []
      setLeadTypes(Array.isArray(data) ? data.map(i => ({ value: String(i.id), label: i.name })) : [])
    } catch (e) { console.error('Error fetching lead types:', e) }
  }, [cid])

  const fetchStates = useCallback(async () => {
    if (!cid) return
    try {
      const res = await crmInstance.get(`/raw-leads/states/${cid}`)
      setStates(res.data.data || [])
    } catch (e) { console.error('Error fetching states:', e) }
  }, [cid])

  const fetchCounts = useCallback(async () => {
    if (!cid) return
    try {
      const res = await crmInstance.get(`/leads/counts/${cid}`)
      const data = res.data.data || {}
      setTotalLeads(data.total_leads || 0)
      setUnassignedLeads(data.unassigned_leads || 0)
    } catch (e) { console.error('Error fetching counts:', e) }
  }, [cid])

  const fetchUsers = useCallback(async (page = 1, append = false) => {
    if (!cid) return
    if (page === 1) setUsersLoading(true)
    else setUsersLoadingMore(true)
    try {
      const res = await crmInstance.get(`/users/${cid}`, { params: { page } })
      const usersData = res.data?.data?.data || res.data?.data || res.data || []
      const userOptions = Array.isArray(usersData)
        ? usersData.map(u => ({
          value: String(u.id),
          label: u.name,
          avatar: u.name ? u.name.charAt(0).toUpperCase() : 'U',
        }))
        : []
      if (append) setUsers(prev => [...prev, ...userOptions])
      else setUsers(userOptions)
      setUsersHasMore(userOptions.length === 5)
      setUsersError('')
    } catch (err) {
      const msg =
        err.response?.status === 401 ? 'Authentication failed. Please login again.' :
          err.response?.status === 403 ? 'You do not have permission to view users.' :
            err.response?.status === 404 ? 'Users endpoint not found.' :
              err.response?.data?.message || 'Failed to load users. Please try again.'
      setUsersError(msg)
      if (!append) setUsers([])
    } finally {
      setUsersLoading(false)
      setUsersLoadingMore(false)
    }
  }, [cid])

  const loadMoreUsers = useCallback(() => {
    if (!usersLoadingMore && usersHasMore) {
      const next = usersPage + 1
      setUsersPage(next)
      fetchUsers(next, true)
    }
  }, [usersLoadingMore, usersHasMore, usersPage, fetchUsers])

  // ─────────────────────────────────────────────────────────────────────────
  // Main fetch
  // fetchLeads is the single source of truth for all filter combinations.
  // It is intentionally the ONLY place setLeads / setHasMore / setCurrentPage
  // are called for lead data — no duplicate calls from other effects.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (page = 1) => {
    if (!cid) return
    setLoading(true)
    setError(null)

    try {
      const params = {
        page,
        per_page: perPage,
        sort_by: 'id',
        sort_order: 'desc',
      }
      if (filterTypeId) params.lead_type_id = filterTypeId
      if (filterState) params.state = filterState
      if (searchTerm) params.search = searchTerm
      if (dateFilter.from) params.from_date = dateFilter.from
      if (dateFilter.to) params.to_date = dateFilter.to
      if (selectedYear) params.year = selectedYear
      if (selectedMonth) params.month = selectedMonth

      const res = await crmInstance.get(`/raw-leads/master-filter/${cid}`, { params })

      if (res.data.success) {
        const pagination = res.data.data
        const newLeads = pagination.data || []

        setLeads(newLeads)
        setFilteredUnassigned(newLeads.filter(l => !l.assigned_to?.name).length)

        const total = pagination.total ?? newLeads.length
        const last = pagination.last_page ?? 1
        const cur = pagination.current_page ?? page

        setTotalRecords(total)
        setLastPage(last)
        setCurrentPage(cur)
        setShowingFrom(total === 0 ? 0 : (pagination.from ?? ((cur - 1) * perPage + 1)))
        setShowingTo(pagination.to ?? Math.min(cur * perPage, total))
        setError(null)
      } else {
        setLeads([])
        setTotalRecords(0)
        setLastPage(1)
        setCurrentPage(1)
        setShowingFrom(0)
        setShowingTo(0)
      }
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError('Failed to load leads. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [cid, filterTypeId, filterState, searchTerm, dateFilter, selectedYear, selectedMonth, perPage])

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // On mount: load lookup data once
  useEffect(() => {
    if (!cid) return
    fetchLeadStatuses()
    fetchLeadTypes()
    fetchUsers(1, false)
    fetchStates()
    fetchCounts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch page 1 whenever a FILTER changes (fetchLeads recreated = new deps).
  // Page navigation itself is handled separately by goToPage() below, so it
  // does not fight with this effect.
  useEffect(() => {
    fetchLeads(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, filterTypeId, filterState, searchTerm, dateFilter, selectedYear, selectedMonth, perPage])

  // ── Search debounce ───────────────────────────────────────────────────────
  const searchInputRef = useRef('')
  const [searchInputValue, setSearchInputValue] = useState('')
  const handleSearchChange = useCallback((value) => {
    searchInputRef.current = value
    setSearchInputValue(value)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInputRef.current !== searchTerm) {
        setSearchTerm(searchInputRef.current)
      }
    }, 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputValue])

  // ── Pagination — replaces infinite scroll entirely ─────────────────────────
  // Clicking a page number / Prev / Next just fetches that page directly.
  // No scroll listeners at all, so scrolling the page never triggers a fetch,
  // never re-renders the table mid-scroll, and the footer never jumps.
  const goToPage = useCallback((page) => {
    if (page < 1 || page > lastPage || page === currentPage || loading) return
    fetchLeads(page)
    // Scroll the table into view so the person sees the new page load
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [fetchLeads, lastPage, currentPage, loading])

  // Builds the [1, '...', 4, 5, 6, '...', 175] style page list for the footer
  const getPageNumbers = () => {
    const pages = []
    const delta = 1 // how many neighbours to show around currentPage
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

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDataUpdate = useCallback((data) => setLeads(data), [])
  const handleSelectionChange = useCallback((rows) => setSelectedLeads(rows), [])

  const handleReset = useCallback(() => {
    setFilterTypeId('')
    setFilterState('')
    setFromDate('')
    setToDate('')
    setDateFilter({ from: '', to: '' })
    setSearchTerm('')
    searchInputRef.current = ''
    setSearchInputValue('')
    setSelectedYear(null)
    setSelectedMonth(null)
    setSelectedLeads([])
    setPerPage(10)
  }, [])

  const handleBulkDraft = useCallback(async () => {
    if (selectedLeads.length === 0) return
    const result = await Swal.fire({
      title: 'Draft Selected Leads?',
      text: `Are you sure you want to draft ${selectedLeads.length} selected lead(s)?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Draft Them', cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return
    try {
      const leadIds = selectedLeads.map(l => l.id)
      const res = await crmInstance.post('/leads/bulk-draft', { lead_ids: leadIds, status: 'deleted' })
      if (res.status >= 200 && res.status < 300) {
        setSelectedLeads([])
        await Swal.fire({ title: 'Success!', text: `Successfully drafted ${selectedLeads.length} lead(s)`, icon: 'success', confirmButtonText: 'OK' })
        fetchLeads(currentPage)
        fetchCounts()
      } else throw new Error('Bulk draft failed')
    } catch (err) {
      console.error('Bulk draft error:', err)
      await Swal.fire({ title: 'Error!', text: 'Failed to draft selected leads. Please try again.', icon: 'error', confirmButtonText: 'OK' })
    }
  }, [selectedLeads, currentPage, fetchLeads, fetchCounts])

  const handleBulkDelete = useCallback(async () => {
    if (selectedLeads.length === 0) {
      await Swal.fire({
        title: 'No Leads Selected',
        text: 'Please select at least one lead to delete.',
        icon: 'warning', confirmButtonText: 'OK',
      })
      return
    }

    const result = await Swal.fire({
      title: 'Delete Selected Leads?',
      html: `
        <p>Are you sure you want to permanently delete <strong>${selectedLeads.length}</strong> selected lead(s)?</p>
        <p class="text-danger mb-0"><small><i class="bi bi-exclamation-triangle me-1"></i>This action cannot be undone.</small></p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return

    const leadIds = selectedLeads.map(l => l.id)
    const total = leadIds.length

    Swal.fire({
      title: 'Deleting Leads...',
      html: `
        <p class="mb-2">Deleting <strong>${total}</strong> lead(s), please wait.</p>
        <div style="background:#e9ecef;border-radius:8px;overflow:hidden;height:22px;width:100%;">
          <div
            id="swal-delete-bar"
            style="height:100%;width:0%;background:linear-gradient(90deg,#d33,#ff6b6b);
                   border-radius:8px;transition:width 0.25s ease;display:flex;
                   align-items:center;justify-content:center;"
          ></div>
        </div>
        <p id="swal-delete-label" class="mt-2 text-muted" style="font-size:13px;">0 / ${total} deleted</p>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => { Swal.showLoading() },
    })

    let fakeProgress = 0
    const barEl = () => document.getElementById('swal-delete-bar')
    const labelEl = () => document.getElementById('swal-delete-label')

    const setBar = (pct, count) => {
      const bar = barEl()
      const label = labelEl()
      if (bar) bar.style.width = `${pct}%`
      if (label) label.textContent = `${count} / ${total} deleted`
    }

    const fakeTimer = setInterval(() => {
      if (fakeProgress < 80) {
        fakeProgress += Math.random() * 8
        const shown = Math.min(fakeProgress, 80)
        setBar(shown, Math.floor((shown / 100) * total))
      }
    }, 150)

    try {
      const res = await crmInstance.delete(`/leads/${cid}/bulk-delete`, {
        data: { ids: leadIds }
      })

      clearInterval(fakeTimer)

      if (res.status === 200) {
        const deletedCount = res.data?.deleted_count ?? total

        setBar(100, deletedCount)
        await new Promise(r => setTimeout(r, 400))

        setSelectedLeads([])

        await Swal.fire({
          title: 'Deleted!',
          text: res.data?.message || `Successfully deleted ${deletedCount} lead(s).`,
          icon: 'success',
          confirmButtonText: 'OK',
        })

        fetchLeads(currentPage)
        fetchCounts()
      } else {
        throw new Error('Bulk delete failed')
      }
    } catch (err) {
      clearInterval(fakeTimer)
      await Swal.fire({
        title: 'Error!',
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to delete selected leads. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
      })
    }
  }, [selectedLeads, fetchCounts, fetchLeads, currentPage])

  const handleBulkStatusUpdate = useCallback(async () => {
    if (selectedLeads.length === 0 || !bulkStatusId) return
    const selectedStatus = leadStatuses.find(s => s.value === bulkStatusId)
    if (!selectedStatus) return
    try {
      const leadIds = selectedLeads.map(l => l.id)
      const res = await crmInstance.post('/leads/bulk-update-status', {
        lead_ids: leadIds,
        lead_status_id: parseInt(bulkStatusId),
        note: bulkStatusNotes || null,
      })
      if (res.status >= 200 && res.status < 300) {
        setLeads(prev => prev.map(l =>
          leadIds.includes(l.id)
            ? { ...l, lead_status: { id: parseInt(bulkStatusId), name: selectedStatus.label } }
            : l
        ))
        await Swal.fire({ title: 'Success!', text: `Successfully updated status of ${selectedLeads.length} lead(s)`, icon: 'success', confirmButtonText: 'OK' })
        setShowBulkStatusModal(false)
        setSelectedLeads([])
        setBulkStatusId('')
        setBulkStatusNotes('')
      } else throw new Error('Bulk status update failed')
    } catch (err) {
      console.error('Bulk status update error:', err)
      await Swal.fire({ title: 'Error!', text: 'Failed to update status. Please try again.', icon: 'error', confirmButtonText: 'OK' })
    }
  }, [selectedLeads, leadStatuses, bulkStatusId, bulkStatusNotes])

  const handleBulkAssignUser = useCallback(async (userId) => {
    const selectedUser = users.find(u => u.value === userId)
    if (!selectedUser) return
    if (selectedLeads.length === 0) {
      await Swal.fire({
        title: 'No Leads Selected',
        text: 'Please select at least one lead before assigning to a user.',
        icon: 'warning', confirmButtonText: 'OK',
      })
      return
    }
    const leadIds = selectedLeads.map(l => l.id)
    const result = await Swal.fire({
      title: 'Assign Selected Leads?',
      text: `Are you sure you want to assign ${selectedLeads.length} lead(s) to "${selectedUser.label}"?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Assign', cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return
    try {
      if (!cid) {
        await Swal.fire({ title: 'Error!', text: 'Company ID not found.', icon: 'error', confirmButtonText: 'OK' })
        return
      }
      const res = await crmInstance.post(`/leads/bulk-assign-user/${cid}`, {
        lead_ids: leadIds,
        assigned_to: parseInt(userId),
      })
      if (res.status >= 200 && res.status < 300) {
        await Swal.fire({ title: 'Success!', text: `Successfully assigned ${selectedLeads.length} lead(s) to ${selectedUser.label}`, icon: 'success', confirmButtonText: 'OK' })
        setSelectedLeads([])
        fetchLeads(currentPage)
        fetchCounts()
      } else throw new Error('Bulk assign failed')
    } catch (err) {
      console.error('Bulk assign error:', err)
      await Swal.fire({ title: 'Error!', text: 'Failed to assign leads. Please try again.', icon: 'error', confirmButtonText: 'OK' })
    }
  }, [selectedLeads, users, cid, fetchCounts, fetchLeads, currentPage])

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
    if (selectedYear) parts.push(`Year: ${selectedYear}`)
    if (selectedMonth) parts.push(`Month: ${monthName(selectedMonth)}`)
    if (dateFilter.from || dateFilter.to) parts.push(`Date: ${dateFilter.from || '...'} to ${dateFilter.to || '...'}`)
    if (searchTerm.trim()) parts.push(`Search: ${searchTerm}`)
    return parts.length ? parts.join(' | ') : 'All Leads'
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PermissionGuard permission="raw-leads">
      <PageHeader>
        <RowLeadsHeader
          selectedLeads={selectedLeads}
          onBulkDraft={handleBulkDraft}
          onBulkDelete={handleBulkDelete}
          onImportSuccess={() => { fetchLeads(1); fetchCounts() }}
          unassignedLeads={unassignedLeads}
          filteredUnassigned={filteredUnassigned}
          hasFilter={filterTypeId || filterState || (dateFilter.from && dateFilter.to)}
        />
      </PageHeader>

      <div className="main-content" style={{ minHeight: '100vh' }}>

        {/* ── Toolbar (Filter toggle + summary + assign-to-user + search + entries-per-page) ── */}
        <div className="lr-toolbar">
          <div className="lr-toolbar-left">
            <button
              type="button"
              className="lr-toolbar-btn"
              onClick={() => router.back()}
            >
              <FiArrowLeft size={14} />
              Back
            </button>
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
            {/* ── Assign Selected Leads to User — sits just left of the search box ── */}
            <div className="lr-toolbar-assign-wrap" style={{ minWidth: '220px' }}>
              <CustomUserDropdown
                users={users}
                selectedUser={null}
                loading={usersLoading}
                loadingMore={usersLoadingMore}
                error={usersError}
                hasMore={usersHasMore}
                onSelect={(user) => handleBulkAssignUser(user.value)}
                onLoadMore={loadMoreUsers}
              />
            </div>

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
                onSelectOption={(option) => setPerPage(parseInt(option.value, 10) || 10)}
              />
            </div>
          </div>
        </div>

        {/* ── Bulk action banner ── */}
        {selectedLeads.length > 0 && (
          <div
            className="d-flex align-items-center gap-2 mb-3 px-3 py-2 rounded"
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

            <button
              type="button"
              className="btn btn-sm btn-danger d-flex align-items-center gap-1"
              onClick={handleBulkDelete}
            >
              <i className="bi bi-trash3-fill"></i>
              Delete Selected
            </button>

            <button
              type="button"
              className="btn btn-sm btn-secondary d-flex align-items-center gap-1"
              onClick={() => setSelectedLeads([])}
            >
              <i className="bi bi-x-lg"></i>
              Clear Selection
            </button>
          </div>
        )}

        <div className="lr-layout">

          {/* ── Sidebar filter panel ── */}
          <div className={`lr-sidebar ${sidebarOpen ? '' : 'lr-hidden'}`}>
            <h4 className="lr-sidebar-title">Filter Leads by</h4>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by Type</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select Type' }, ...leadTypes]}
                selectedOption={
                  leadTypes.find(t => t.value === filterTypeId)
                    ? { value: filterTypeId, label: leadTypes.find(t => t.value === filterTypeId)?.label }
                    : { value: '', label: 'Select Type' }
                }
                defaultSelect={{ value: '', label: 'Select Type' }}
                onSelectOption={(option) => setFilterTypeId(option.value)}
              />
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Filter by State</label>
              <SelectDropdown
                options={[{ value: '', label: 'Select State' }, ...states.map(s => ({ value: s, label: s }))]}
                selectedOption={
                  states.find(s => s === filterState)
                    ? { value: filterState, label: filterState }
                    : { value: '', label: 'Select State' }
                }
                defaultSelect={{ value: '', label: 'Select State' }}
                onSelectOption={(option) => setFilterState(option.value)}
              />
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Year</label>
              <select
                className="lr-filter-input"
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">All Years</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const y = new Date().getFullYear() - i
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>

            <div className="lr-filter-group">
              <label className="lr-filter-label">Month</label>
              <select
                className="lr-filter-input"
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">All Months</option>
                {MONTH_NAMES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

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
                onClick={() => setDateFilter({ from: fromDate, to: toDate })}
              >
                Apply Date Filter
              </button>
            </div>

            <button
              className="lr-sidebar-reset-btn"
              type="button"
              onClick={handleReset}
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

              {error && !dateFilter.from && !dateFilter.to && !filterTypeId && !filterState && (
                <div className="alert alert-danger m-3">{error}</div>
              )}

              {loading && (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <Loading />
                </div>
              )}

              {!loading && (
                <>
                  {(selectedYear || selectedMonth) && (
                    <div className="d-flex align-items-center gap-2 p-3">
                      <span className="text-muted small">Filtering by:</span>
                      {selectedYear && (
                        <span className="badge bg-primary-subtle text-primary px-3 py-2" style={{ fontSize: '13px' }}>
                          <i className="bi bi-calendar3 me-1"></i>Year: {selectedYear}
                        </span>
                      )}
                      {selectedMonth && (
                        <span className="badge bg-info-subtle text-info px-3 py-2" style={{ fontSize: '13px' }}>
                          <i className="bi bi-calendar-month me-1"></i>Month: {monthName(selectedMonth)}
                        </span>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setSelectedYear(null); setSelectedMonth(null) }}
                      >
                        <i className="bi bi-x me-1"></i>Clear
                      </button>
                    </div>
                  )}

                  {leads.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-search" style={{ fontSize: '48px', color: '#ccc' }}></i>
                      <h5 className="mt-3 text-muted">No Leads Found</h5>
                      <p className="text-muted mb-0">
                        No leads match your current filters. Try adjusting or resetting them.
                      </p>
                    </div>
                  ) : (
                    <LeadsTable
                      data={leads}
                      onDataUpdate={handleDataUpdate}
                      onSelectionChange={handleSelectionChange}
                      leadStatuses={leadStatuses}
                      allowedActions={['view', 'edit', 'history', 'delete']}
                      showEntriesInfo={false}
                      showEntriesDropdown={false}
                      hiddenColumns={[]}
                      onViewLead={handleOpenView}
                      onEditLead={handleOpenEdit}
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
      </div>
      <Footer />

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Status for {selectedLeads.length} Selected Lead(s)</h5>
                <button type="button" className="btn-close" onClick={() => setShowBulkStatusModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Status</label>
                  <SelectDropdown
                    options={leadStatuses}
                    selectedOption={leadStatuses.find(s => s.value === bulkStatusId) || null}
                    onSelectOption={(option) => setBulkStatusId(option?.value || '')}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control" rows="3"
                    placeholder="Add notes about this status update..."
                    value={bulkStatusNotes}
                    onChange={(e) => setBulkStatusNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkStatusModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleBulkStatusUpdate}>Update Status</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showBulkStatusModal && <div className="modal-backdrop fade show"></div>}

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

    </PermissionGuard>
  )
}

// ─── Outer wrapper: Suspense required for useSearchParams ────────────────────
const page = () => (
  <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  }>
    <RawLeadsInner />
  </Suspense>
)

export default page