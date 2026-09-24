'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import LeadssTable from '@/components/leads/LeadsTable'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'
import SelectDropdown from '@/components/shared/SelectDropdown'
import crmInstance from '@/utils/crmInstance'
import { useSearchParams } from 'next/navigation'
import { FiFilter, FiSearch } from 'react-icons/fi'
import '@/styles/leadsReport.css'
import { toInputDate, todayInputDate } from '@/utils/formatDate'

// ── View / Edit modals — loaded client-side only, same pattern as RawLeads page ──
const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })

const page = () => {
    const searchParams = useSearchParams()

    // ✅ URL params se seedha initial value lo — koi alag useEffect nahi
    const [filterYear, setFilterYear] = useState(() => {
        const param = searchParams.get('year')
        return param ? parseInt(param) : ''
    })
    const [filterMonth, setFilterMonth] = useState(() => {
        const param = searchParams.get('month')
        return param ? parseInt(param) : ''
    })

    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [totalLeads, setTotalLeads] = useState(0)
    const [states, setStates] = useState([])
    const [designations, setDesignations] = useState([])
    const [leadTypes, setLeadTypes] = useState([])
    const [users, setUsers] = useState([])
    const [filterState, setFilterState] = useState('')
    const [filterDesignation, setFilterDesignation] = useState('')
    const [filterTypeId, setFilterTypeId] = useState('')
    const [filterUserId, setFilterUserId] = useState('')
    const [filterFollowupFrom, setFilterFollowupFrom] = useState('')
    const [filterFollowupTo, setFilterFollowupTo] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)
    const [leadStatuses, setLeadStatuses] = useState([])

    // ── NEW: per-user followup counts panel (superadmin/admin only) ──
    const [userFollowupCounts, setUserFollowupCounts] = useState([])
    const [userCountsLoading, setUserCountsLoading] = useState(false)
    const [showUserCountsPanel, setShowUserCountsPanel] = useState(true)

    // ✅ CHANGED: infinite scroll removed — replaced with classic numbered
    // pagination (Prev / 1 2 3 ... / Next), same pattern as LeadsPageClient.
    // `leads` now always holds just the CURRENT page's rows.
    const [currentPage, setCurrentPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [totalRecords, setTotalRecords] = useState(0)
    const [showingFrom, setShowingFrom] = useState(0)
    const [showingTo, setShowingTo] = useState(0)

    // How many leads load per page.
    const [perPage, setPerPage] = useState(15)
    const entriesPerPageOptions = [
        { value: '15',  label: '15 per page'  },
        { value: '25',  label: '25 per page'  },
        { value: '50',  label: '50 per page'  },
        { value: '100', label: '100 per page' },
    ]

    // ── purely visual — sidebar show/hide, same pattern as the Leads Report page ──
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // ── NEW: modal state — same pattern as ConvertedLeads page ──
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewLeadId, setViewLeadId] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editLeadId, setEditLeadId] = useState(null)

    // ✅ isInitialMount HATAO — ab sirf ek central fetchLeads call hoga
    const isFetchingRef = useRef(false) // double call guard

    const [companyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })

    // ✅ Saare filter ek object mein — easy tracking
    const filtersRef = useRef({
        filterState: '',
        filterDesignation: '',
        filterTypeId: '',
        filterUserId: '',
        filterFollowupFrom: '',
        filterFollowupTo: '',
        filterYear: filterYear,
        filterMonth: filterMonth,
        searchTerm: '',
    })

    // ── sort leads so followups needing urgent attention come first ──
    // Order: Today's followup (red) → Overdue (red) → Upcoming (soonest first)
    // → No followup date (last). Applied only to the CURRENT page's rows.
    const sortByFollowup = (arr) => {
        const getDate = (l) => l.followup_date ?? l.follow_up_date ?? l.next_followup_date ?? null
        const todayStr = todayInputDate()

        const rank = (l) => {
            const raw = getDate(l)
            if (!raw) return 3 // no followup date → goes last
            try {
                const dStr = toInputDate(raw)
                if (dStr === todayStr) return 0   // today → top (shown red)
                if (dStr < todayStr) return 1     // overdue → next (shown red)
                return 2                          // upcoming → after that
            } catch {
                return 3
            }
        }

        return [...arr].sort((a, b) => {
            const ra = rank(a)
            const rb = rank(b)
            if (ra !== rb) return ra - rb
            // within the same bucket, sort by date ascending (soonest first)
            const da = getDate(a)
            const db = getDate(b)
            if (!da || !db) return 0
            return new Date(da) - new Date(db)
        })
    }

    const fetchLeadStatuses = async (cid) => {
        try {
            const response = await crmInstance.get(`/lead-status/${cid}`)
            const data = response.data.data.data || response.data.data || response.data || []
            setLeadStatuses(Array.isArray(data) ? data.map(item => ({
                value: String(item.id), label: item.name
            })) : [])
        } catch (err) { console.error('Error fetching lead statuses:', err) }
    }

    const fetchStates = async (cid) => {
        try {
            const response = await crmInstance.get(`/followups/states/${cid}`)
            setStates(response.data.data || [])
        } catch (err) { console.error('Error fetching states:', err) }
    }

    const fetchDesignations = async (cid) => {
        try {
            const response = await crmInstance.get(`/followups/designations/${cid}`)
            setDesignations(response.data.data || [])
        } catch (err) { console.error('Error fetching designations:', err) }
    }

    const fetchLeadTypes = async (cid) => {
        try {
            const response = await crmInstance.get(`/lead-types/${cid}`)
            const data = response.data.data.data || []
            setLeadTypes(Array.isArray(data) ? data.map(item => ({
                value: String(item.id), label: item.name
            })) : [])
        } catch (err) { console.error('Error fetching lead types:', err) }
    }

    const fetchUsers = async (cid) => {
        try {
            const response = await crmInstance.get(`/followups/users/${cid}`)
            if (response.data.success) {
                const usersData = response.data.data || []
                setUsers(Array.isArray(usersData) ? usersData.map(user => ({
                    value: String(user.value),
                    label: user.label.split(' (')[0],
                    avatar: user.label ? user.label.charAt(0).toUpperCase() : 'U'
                })) : [])
            } else {
                setUsers([])
            }
        } catch (err) {
            console.error('Error fetching users:', err)
            setUsers([])
        }
    }

    // ── NEW: fetch how many followup leads each user has to take.
    // Calls the same master-filter endpoint per user with per_page:1 —
    // we only need `total`, not the actual rows — so it's lightweight,
    // and all calls run in parallel via Promise.all. ──
    const fetchUserFollowupCounts = async (cid, usersList) => {
        if (!usersList || !usersList.length) {
            setUserFollowupCounts([])
            return
        }
        try {
            setUserCountsLoading(true)
            const results = await Promise.all(
                usersList.map(async (u) => {
                    try {
                        const res = await crmInstance.get(`/followups/master-filter/${cid}`, {
                            params: { page: 1, per_page: 1, assigned_to: u.value }
                        })
                        const total = res.data?.success ? (res.data.data?.total ?? 0) : 0
                        return { userId: u.value, name: u.label, avatar: u.avatar, count: total }
                    } catch {
                        return { userId: u.value, name: u.label, avatar: u.avatar, count: 0 }
                    }
                })
            )
            // sirf jinke pending followups hain, sabse zyada wale upar
            const withCounts = results
                .filter(r => r.count > 0)
                .sort((a, b) => b.count - a.count)
            setUserFollowupCounts(withCounts)
        } catch (err) {
            console.error('Error fetching per-user followup counts:', err)
            setUserFollowupCounts([])
        } finally {
            setUserCountsLoading(false)
        }
    }

    // ✅ fetchLeads ab filtersRef se read karta hai — stale closure problem khatam
    // ✅ CHANGED: `append` param hata diya — har call current page ke data ko
    // REPLACE karta hai. Pagination meta (lastPage/totalRecords/showingFrom/
    // showingTo) bhi yahin set hota hai footer ke liye.
    const fetchLeads = useCallback(async (page = 1) => {
        if (isFetchingRef.current) return
        isFetchingRef.current = true

        try {
            setLoading(true)
            setError(null)

            const rawCid = localStorage.getItem('companyId')
            const cid = rawCid ? JSON.parse(rawCid) : null
            if (!cid) return

            const f = filtersRef.current
            const params = { page, per_page: perPage }
            if (f.filterTypeId)      params.lead_type_id      = f.filterTypeId
            if (f.filterState)       params.state              = f.filterState
            if (f.filterDesignation) params.designation        = f.filterDesignation
            if (f.filterUserId)      params.assigned_to        = f.filterUserId
            if (f.filterFollowupFrom) params.followup_from_date = f.filterFollowupFrom
            if (f.filterFollowupTo)  params.followup_to_date   = f.filterFollowupTo
            if (f.searchTerm)        params.search             = f.searchTerm
            if (f.filterYear)        params.year               = f.filterYear
            if (f.filterMonth)       params.month              = f.filterMonth

            const response = await crmInstance.get(`/followups/master-filter/${cid}`, { params })

            if (response.data.success) {
                const pg = response.data.data
                const newLeads = pg.data || []

                setLeads(sortByFollowup(newLeads))

                const total = pg.total ?? newLeads.length
                const last  = pg.last_page ?? 1
                const cur   = pg.current_page ?? page

                setTotalLeads(total)
                setTotalRecords(total)
                setLastPage(last)
                setCurrentPage(cur)
                setShowingFrom(total === 0 ? 0 : (pg.from ?? ((cur - 1) * perPage + 1)))
                setShowingTo(pg.to ?? Math.min(cur * perPage, total))
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
            setLeads([])
        } finally {
            setLoading(false)
            isFetchingRef.current = false
        }
    }, [perPage])

    // ✅ SIRF EK useEffect — page load pe ek hi baar sab kuch fetch hoga
    useEffect(() => {
        if (!companyId) return
        const cid = JSON.parse(companyId)

        // ✅ Superadmin/Admin check — bug fix: parsedUser use karo, raw `user` string nahi
        const user = localStorage.getItem("user")
        if (user) {
            const parsedUser = JSON.parse(user)
            const roleName = typeof parsedUser.role === 'string'
                ? parsedUser.role
                : (parsedUser.role?.name || parsedUser.userRole?.name || '')
            setIsSuperAdmin(roleName === 'superadmin' || roleName === 'admin')
        }

        // Saare dropdown data parallel fetch karo
        Promise.all([
            fetchLeadStatuses(cid),
            fetchStates(cid),
            fetchDesignations(cid),
            fetchLeadTypes(cid),
            fetchUsers(cid),
        ])

        // ✅ Sirf ek baar leads fetch — koi double call nahi
        fetchLeads(1)

    }, []) // ← empty dependency — sirf mount pe ek baar

    // ── NEW: jaise hi `users` list aa jaye aur user superadmin/admin ho,
    // per-user followup counts fetch karo. `users` state update hone ka
    // wait karna padta hai kyunki fetchUsers() async hai. ──
    useEffect(() => {
        if (!isSuperAdmin || !companyId || !users.length) return
        const cid = JSON.parse(companyId)
        fetchUserFollowupCounts(cid, users)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin, users])

    // ✅ Filter change handler — ref update karo phir page 1 se fetch karo
    const applyFilter = useCallback((key, value) => {
        filtersRef.current = { ...filtersRef.current, [key]: value }

        // State bhi update karo UI ke liye
        switch(key) {
            case 'filterState':        setFilterState(value); break
            case 'filterDesignation':  setFilterDesignation(value); break
            case 'filterTypeId':       setFilterTypeId(value); break
            case 'filterUserId':       setFilterUserId(value); break
            case 'filterFollowupFrom': setFilterFollowupFrom(value); break
            case 'filterFollowupTo':   setFilterFollowupTo(value); break
        }

        fetchLeads(1)
    }, [fetchLeads])

    // ✅ Entries-per-page badalte hi page 1 se refetch
    useEffect(() => {
        fetchLeads(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [perPage])

    // ✅ Search — debounced, ref se
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (filtersRef.current.searchTerm === searchTerm) return // koi change nahi
            filtersRef.current = { ...filtersRef.current, searchTerm }
            fetchLeads(1)
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

    // ✅ URL params — sirf jab actually change ho
    useEffect(() => {
        const yearParam  = searchParams.get('year')
        const monthParam = searchParams.get('month')
        const newYear    = yearParam  ? parseInt(yearParam)  : ''
        const newMonth   = monthParam ? parseInt(monthParam) : ''

        // ✅ Pehle check karo — agar same value hai toh fetch mat karo
        if (newYear === filtersRef.current.filterYear &&
            newMonth === filtersRef.current.filterMonth) return

        filtersRef.current = { ...filtersRef.current, filterYear: newYear, filterMonth: newMonth }
        setFilterYear(newYear)
        setFilterMonth(newMonth)
        fetchLeads(1)
    }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Numbered pagination — replaces infinite scroll entirely ─────────────
    // No scroll listeners anywhere. Clicking Prev / a page number / Next just
    // fetches that page directly.
    const goToPage = useCallback((pageNum) => {
        if (pageNum < 1 || pageNum > lastPage || pageNum === currentPage || loading) return
        fetchLeads(pageNum)
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

    // ── purely presentational — builds the filter-summary text shown in the toolbar ──
    const buildFilterSummary = () => {
        const parts = []
        if (filterTypeId) {
            const t = leadTypes.find(x => x.value === filterTypeId)
            if (t) parts.push(`Type: ${t.label}`)
        }
        if (filterState) parts.push(`State: ${filterState}`)
        if (filterDesignation) parts.push(`Designation: ${filterDesignation}`)
        if (isSuperAdmin && filterUserId) {
            const u = users.find(x => x.value === filterUserId)
            if (u) parts.push(`User: ${u.label}`)
        }
        if (filterFollowupFrom || filterFollowupTo) {
            parts.push(`Follow up: ${filterFollowupFrom || '...'} to ${filterFollowupTo || '...'}`)
        }
        if (searchTerm.trim()) parts.push(`Search: ${searchTerm}`)
       return parts.length ? parts.join(' | ') : `All Follow Up Leads ( ${totalRecords} )`
    }

    // ── resets the same filters that already exist — no new fields, no new logic ──
    const handleResetFilters = () => {
        filtersRef.current = {
            ...filtersRef.current,
            filterState: '',
            filterDesignation: '',
            filterTypeId: '',
            filterUserId: '',
            filterFollowupFrom: '',
            filterFollowupTo: '',
            searchTerm: '',
        }
        setFilterState('')
        setFilterDesignation('')
        setFilterTypeId('')
        setFilterUserId('')
        setFilterFollowupFrom('')
        setFilterFollowupTo('')
        setSearchTerm('')
        fetchLeads(1)
    }

    // ── NEW: refresh current page's leads + per-user counts together
    // (used after a status update, since a lead moving in/out of
    // "follow up" status changes both) ──
    const refreshLeadsAndCounts = useCallback((pageNum = currentPage) => {
        fetchLeads(pageNum)
        if (isSuperAdmin && companyId && users.length) {
            fetchUserFollowupCounts(JSON.parse(companyId), users)
        }
    }, [fetchLeads, currentPage, isSuperAdmin, companyId, users])

    // ── modal open/close helpers — same pattern as ConvertedLeads page ──
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

    return (
        <PermissionGuard permission="view-leads">
          

            <div className='main-content'>

                {/* ── Toolbar ── */}
                <div className="lr-toolbar">
                    <div className="lr-toolbar-left">
                        <button
                            type="button"
                            className={`lr-toolbar-btn ${sidebarOpen ? 'lr-active' : ''}`}
                            onClick={() => setSidebarOpen(o => !o)}
                        >
                            <FiFilter size={14} />
                            Filter
                        </button>
                        <div className="lr-toolbar-divider" />
                        <span className="lr-page-info">{buildFilterSummary()}</span>
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
                                onSelectOption={(opt) => setPerPage(parseInt(opt.value, 10) || 15)}
                            />
                        </div>
                    </div>
                </div>

                {/* ── NEW: Follow-ups by User panel — superadmin/admin only ── */}
                {isSuperAdmin && (
                    <div className="lr-table-card" style={{ margin: '14px', padding: '14px' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setShowUserCountsPanel(o => !o)}
                        >
                            <h4 className="lr-sidebar-title" style={{ margin: 0 }}>Follow-ups by User</h4>
                            <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                {showUserCountsPanel ? 'Hide ▲' : 'Show ▼'}
                            </span>
                        </div>

                        {showUserCountsPanel && (
                            userCountsLoading ? (
                                <div className="d-flex justify-content-center align-items-center py-3">
                                    <Loading />
                                </div>
                            ) : userFollowupCounts.length === 0 ? (
                                <div className="text-muted py-2"><small>Koi bhi user ke paas pending followup nahi hai.</small></div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                                    {userFollowupCounts.map((u) => (
                                        <button
                                            key={u.userId}
                                            type="button"
                                            onClick={() => applyFilter('filterUserId', u.userId)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: filterUserId === u.userId ? '1.5px solid #0d6efd' : '1px solid #e0e0e0',
                                                background: filterUserId === u.userId ? '#eef5ff' : '#fff',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                            title={`${u.name} ke paas ${u.count} followup lead(s) hain — click to filter`}
                                        >
                                            <span style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: '#0d6efd', color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 600, flexShrink: 0,
                                            }}>
                                                {u.avatar || u.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{u.name}</span>
                                            <span style={{
                                                background: '#ef4444', color: '#fff', fontSize: '11px',
                                                fontWeight: 700, borderRadius: '999px', minWidth: 20,
                                                textAlign: 'center', padding: '1px 6px',
                                            }}>
                                                {u.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )
                        )}
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
                                selectedOption={leadTypes.find(t => t.value === filterTypeId) || { value: '', label: 'Select Type' }}
                                defaultSelect={{ value: '', label: 'Select Type' }}
                                onSelectOption={(opt) => applyFilter('filterTypeId', opt.value)}
                            />
                        </div>

                        <div className="lr-filter-group">
                            <label className="lr-filter-label">Filter by State</label>
                            <SelectDropdown
                                options={[{ value: '', label: 'Select State' }, ...states.map(s => ({ value: s, label: s }))]}
                                selectedOption={filterState ? { value: filterState, label: filterState } : { value: '', label: 'Select State' }}
                                defaultSelect={{ value: '', label: 'Select State' }}
                                onSelectOption={(opt) => applyFilter('filterState', opt.value)}
                            />
                        </div>

                        <div className="lr-filter-group">
                            <label className="lr-filter-label">Filter by Designation</label>
                            <SelectDropdown
                                options={[{ value: '', label: 'Select Designation' }, ...designations.map(d => ({ value: d, label: d }))]}
                                selectedOption={filterDesignation ? { value: filterDesignation, label: filterDesignation } : { value: '', label: 'Select Designation' }}
                                defaultSelect={{ value: '', label: 'Select Designation' }}
                                onSelectOption={(opt) => applyFilter('filterDesignation', opt.value)}
                            />
                        </div>

                        {isSuperAdmin && (
                            <div className="lr-filter-group">
                                <label className="lr-filter-label">Filter by User</label>
                                <SelectDropdown
                                    options={[{ value: '', label: 'Select User' }, ...users]}
                                    selectedOption={users.find(u => u.value === filterUserId) || { value: '', label: 'Select User' }}
                                    defaultSelect={{ value: '', label: 'Select User' }}
                                    onSelectOption={(opt) => applyFilter('filterUserId', opt.value)}
                                />
                            </div>
                        )}

                        <div className="lr-filter-group">
                            <label className="lr-filter-label">Follow up Date Range</label>
                            <div className="lr-filter-row-2">
                                <input
                                    type="date"
                                    className="lr-filter-input"
                                    value={filterFollowupFrom}
                                    onChange={(e) => applyFilter('filterFollowupFrom', e.target.value)}
                                />
                                <input
                                    type="date"
                                    className="lr-filter-input"
                                    value={filterFollowupTo}
                                    onChange={(e) => applyFilter('filterFollowupTo', e.target.value)}
                                />
                            </div>
                        </div>

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

                    {/* ── Table ── */}
                    <div className="lr-content">
                        <div className="lr-table-card">
                            <div style={{ padding: '14px' }}>
                                {error && <div className="alert alert-danger">{error}</div>}

                                {loading ? (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Loading />
                                    </div>
                                ) : (
                                    <>
                                        <LeadssTable
                                            data={leads}
                                            leadStatuses={leadStatuses}
                                            allowedActions={['status-update', 'view', 'edit']}
                                            showFollowupDateColumn={true}
                                            showSerialNumbers={true}
                                            onDataUpdate={(updatedData) => {
                                                setLeads(sortByFollowup(updatedData.filter(lead =>
                                                    (lead.lead_status?.name || '').toLowerCase().includes('follow up')
                                                )))
                                            }}
                                            onViewLead={(leadId) => handleOpenView(leadId)}
                                            onEditLead={(leadId) => handleOpenEdit(leadId)}
                                            onStatusUpdateSuccess={() => refreshLeadsAndCounts()}
                                        />

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
            </div>

            <Footer />

            {/* ── Lead View Modal — same component & pattern as ConvertedLeads page ── */}
            {showViewModal && (
                <LeadViewModal
                    show={showViewModal}
                    leadId={viewLeadId}
                    onClose={handleCloseView}
                    onStatusUpdated={() => refreshLeadsAndCounts()}
                />
            )}

            {/* ── Lead Edit Modal — same component & pattern as ConvertedLeads page ── */}
            {showEditModal && (
                <LeadEditModal
                    leadId={editLeadId}
                    onClose={handleCloseEdit}
                    onUpdated={() => refreshLeadsAndCounts()}
                />
            )}
        </PermissionGuard>
    )
}

export default page