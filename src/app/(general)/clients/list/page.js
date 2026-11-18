'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import {
    FiEdit3,
    FiEye,
    FiTrash2,
    FiPlus,
    FiDownload,
    FiUpload,
    FiSearch,
    FiX,
    FiBriefcase,
    FiCheckCircle,
    FiPauseCircle,
    FiLayers,
    FiMail,
    FiPhone,
    FiMapPin,
    FiUser,
    FiCalendar,
    FiList,
    FiGrid,
    FiExternalLink,
    FiInfo,
    FiCopy,
    FiCheck
} from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { useUser } from '@/context/UserContext'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'
import { exportToExcel } from '@/utils/exportExcel'
import SpreadsheetImportModal from '@/components/shared/SpreadsheetImportModal'

const PER_PAGE = 12

const AVATAR_PALETTES = [
    { bg: 'bg-soft-primary', text: 'text-primary' },
    { bg: 'bg-soft-success', text: 'text-success' },
    { bg: 'bg-soft-info', text: 'text-info' },
    { bg: 'bg-soft-warning', text: 'text-warning' },
    { bg: 'bg-soft-danger', text: 'text-danger' },
    { bg: 'bg-soft-secondary', text: 'text-dark' },
]

const getInitials = (name) => {
    if (!name) return 'CL'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getAvatarStyle = (name) => {
    if (!name) return AVATAR_PALETTES[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

const ClientsListPage = () => {
    const { hasPermission } = usePermissions()
    const { isPlatform } = useUser()

    const [clients, setClients] = useState([])
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [currentPage, setCurrentPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
    const [exporting, setExporting] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [stats, setStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [quickViewClient, setQuickViewClient] = useState(null)
    const [copiedKey, setCopiedKey] = useState('')

    // Fetch Stats
    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true)
            const { data } = await crmInstance.get('/clients/stats')
            setStats(data)
        } catch {
            // non-fatal, fallback to list counts
            setStats(null)
        } finally {
            setStatsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    // Fetch Clients List
    const fetchClients = useCallback(async (pageNo = currentPage) => {
        try {
            setLoading(true)
            const params = {
                page: pageNo,
                per_page: PER_PAGE,
                with_companies: 1
            }
            if (searchTerm) params.search = searchTerm.trim()
            if (statusFilter) params.status = statusFilter

            const response = await crmInstance.get('/clients', { params })
            const { data, current_page, last_page, total } = response.data
            setClients(Array.isArray(data) ? data : [])
            setMeta({ current_page, last_page, total })
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load clients. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [currentPage, searchTerm, statusFilter])

    // Debounced filter/search change
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1)
            fetchClients(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm, statusFilter, fetchClients])

    const goToPage = (pageNo) => {
        if (pageNo < 1 || pageNo > meta.last_page || pageNo === currentPage) return
        setCurrentPage(pageNo)
        fetchClients(pageNo)
    }

    const handleDelete = async (client) => {
        const result = await Swal.fire({
            title: 'Delete client?',
            text: client.companies_count > 0
                ? `"${client.name}" is linked to ${client.companies_count} company/companies. The companies will NOT be deleted, only unlinked.`
                : `"${client.name}" will be permanently removed.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete client'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/clients/${client.id}`)
            Swal.fire({
                title: 'Deleted!',
                text: 'Client has been removed successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
            if (quickViewClient?.id === client.id) setQuickViewClient(null)
            fetchStats()
            fetchClients(clients.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage)
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete client', 'error')
        }
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const params = { per_page: 5000, with_companies: 1 }
            if (searchTerm) params.search = searchTerm.trim()
            if (statusFilter) params.status = statusFilter
            const { data } = await crmInstance.get('/clients', { params })
            exportToExcel('Clients_Directory', [{
                name: 'Clients',
                rows: (data.data || []).map(c => ({
                    'Client Name': c.name,
                    'Contact Person': c.contact_person || '',
                    'Email': c.email || '',
                    'Phone': c.phone || '',
                    'Address': c.address || '',
                    'Status': c.status || 'Active',
                    'Companies Count': c.companies_count || 0,
                    'Company Names': (c.companies || []).map(co => co.name).join(', '),
                    'Notes': c.notes || '',
                    'Created Date': c.created_at ? formatDate(c.created_at) : '',
                })),
            }])
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Export failed', 'error')
        } finally {
            setExporting(false)
        }
    }

    const copyToClipboard = (text, key) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(''), 2000)
    }

    const canImport = isPlatform && hasPermission('create-clients')
    const canCreate = isPlatform && hasPermission('create-clients')

    const statTotals = useMemo(() => {
        if (stats) return stats
        return {
            total: meta.total || clients.length,
            active: clients.filter(c => c.status === 'Active').length,
            inactive: clients.filter(c => c.status === 'Inactive').length,
            total_companies: clients.reduce((acc, c) => acc + (c.companies_count || 0), 0)
        }
    }, [stats, meta.total, clients])

    const startIndex = (meta.current_page - 1) * PER_PAGE

    return (
        <PermissionGuard permission="view-clients">
            {/* Header */}
            <PageHeader>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 w-100">
                    <div>
                        <h4 className="mb-0 fw-bold text-dark">Clients Management</h4>
                        <span className="fs-12 text-muted">
                            Directory of client organizations, billing entities, and assigned practices
                        </span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm"
                            onClick={handleExport}
                            disabled={exporting}
                            title="Export client list to Excel"
                        >
                            <FiDownload size={15} />
                            <span>{exporting ? 'Exporting...' : 'Export'}</span>
                        </button>

                        {canImport && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm"
                                onClick={() => setShowImport(true)}
                                title="Import clients spreadsheet"
                            >
                                <FiUpload size={15} />
                                <span>Import</span>
                            </button>
                        )}

                        {canCreate && (
                            <Link href="/clients/create" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
                                <FiPlus size={16} />
                                <span>Create Client</span>
                            </Link>
                        )}
                    </div>
                </div>
            </PageHeader>

            {/* Import Modal */}
            {showImport && (
                <SpreadsheetImportModal
                    title="Import Clients"
                    endpoint="/clients/import"
                    columnsHelp="Columns: name (required), contact_person, email, phone, address, status (Active / Inactive), notes. A client whose name already exists will be skipped."
                    template={{
                        fileName: 'clients_import_template',
                        headers: ['name', 'contact_person', 'email', 'phone', 'address', 'status', 'notes'],
                        example: ['Premier Health Partners', 'John Doe', 'john@premierhealth.com', '(555) 019-2834', '1200 Medical Center Dr', 'Active', 'Primary client entity'],
                    }}
                    onClose={() => setShowImport(false)}
                    onImported={() => {
                        fetchStats()
                        fetchClients(1)
                    }}
                />
            )}

            <div className="main-content">
                {/* Top Metrics Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-xl-3 col-sm-6">
                        <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' }}>
                            <div className="card-body p-3 p-md-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="fs-12 fw-semibold text-muted text-uppercase letter-spacing-1">Total Clients</span>
                                    <div className="avatar-text avatar-md bg-soft-primary text-primary rounded-3 shadow-none">
                                        <FiBriefcase size={18} />
                                    </div>
                                </div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    {statsLoading && !stats ? '—' : statTotals.total}
                                </h3>
                                <div className="d-flex align-items-center gap-1 text-muted fs-12">
                                    <span className="badge bg-soft-primary text-primary px-2 py-0.5 rounded-pill">All Enrolled</span>
                                    <span>Organizations</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-sm-6">
                        <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f6fcf8 100%)' }}>
                            <div className="card-body p-3 p-md-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="fs-12 fw-semibold text-muted text-uppercase letter-spacing-1">Active Accounts</span>
                                    <div className="avatar-text avatar-md bg-soft-success text-success rounded-3 shadow-none">
                                        <FiCheckCircle size={18} />
                                    </div>
                                </div>
                                <h3 className="fw-bold mb-1 text-success">
                                    {statsLoading && !stats ? '—' : statTotals.active}
                                </h3>
                                <div className="d-flex align-items-center gap-1 text-muted fs-12">
                                    <span className="badge bg-soft-success text-success px-2 py-0.5 rounded-pill">Operational</span>
                                    <span>Active status</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-sm-6">
                        <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fffbf8 100%)' }}>
                            <div className="card-body p-3 p-md-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="fs-12 fw-semibold text-muted text-uppercase letter-spacing-1">Inactive / On Hold</span>
                                    <div className="avatar-text avatar-md bg-soft-warning text-warning rounded-3 shadow-none">
                                        <FiPauseCircle size={18} />
                                    </div>
                                </div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    {statsLoading && !stats ? '—' : statTotals.inactive}
                                </h3>
                                <div className="d-flex align-items-center gap-1 text-muted fs-12">
                                    <span className="badge bg-soft-secondary text-secondary px-2 py-0.5 rounded-pill">Paused</span>
                                    <span>Requires review</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-sm-6">
                        <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)' }}>
                            <div className="card-body p-3 p-md-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="fs-12 fw-semibold text-muted text-uppercase letter-spacing-1">Linked Companies</span>
                                    <div className="avatar-text avatar-md bg-soft-info text-info rounded-3 shadow-none">
                                        <FiLayers size={18} />
                                    </div>
                                </div>
                                <h3 className="fw-bold mb-1 text-primary">
                                    {statsLoading && !stats ? '—' : statTotals.total_companies}
                                </h3>
                                <div className="d-flex align-items-center gap-1 text-muted fs-12">
                                    <span className="badge bg-soft-info text-info px-2 py-0.5 rounded-pill">Total Units</span>
                                    <span>Medical practices</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-header bg-transparent border-0 pt-4 px-4 pb-0">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 border-bottom">
                            {/* Status Filter Tabs */}
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill px-3 fw-semibold ${statusFilter === '' ? 'btn-primary' : 'btn-light text-muted'}`}
                                    onClick={() => setStatusFilter('')}
                                >
                                    All Clients ({statTotals.total})
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-1.5 ${statusFilter === 'Active' ? 'btn-success' : 'btn-light text-muted'}`}
                                    onClick={() => setStatusFilter('Active')}
                                >
                                    <span className="d-inline-block rounded-circle bg-success me-1" style={{ width: 6, height: 6 }}></span>
                                    Active ({statTotals.active})
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-1.5 ${statusFilter === 'Inactive' ? 'btn-secondary' : 'btn-light text-muted'}`}
                                    onClick={() => setStatusFilter('Inactive')}
                                >
                                    <span className="d-inline-block rounded-circle bg-secondary me-1" style={{ width: 6, height: 6 }}></span>
                                    Inactive ({statTotals.inactive})
                                </button>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="d-flex align-items-center gap-2">
                                <div className="btn-group btn-group-sm p-1 bg-light rounded-pill border" role="group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm rounded-pill px-3 border-0 ${viewMode === 'table' ? 'btn-white bg-white text-primary shadow-sm fw-bold' : 'text-muted'}`}
                                        onClick={() => setViewMode('table')}
                                        title="Table View"
                                    >
                                        <FiList className="me-1" /> Table
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm rounded-pill px-3 border-0 ${viewMode === 'grid' ? 'btn-white bg-white text-primary shadow-sm fw-bold' : 'text-muted'}`}
                                        onClick={() => setViewMode('grid')}
                                        title="Grid Cards View"
                                    >
                                        <FiGrid className="me-1" /> Grid
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search and Secondary Filter Bar */}
                        <div className="row g-2 pt-3 align-items-center">
                            <div className="col-md-7 col-lg-6">
                                <div className="position-relative">
                                    <FiSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                    <input
                                        type="text"
                                        className="form-control rounded-pill ps-5 pe-5 py-2 border-light-subtle shadow-none"
                                        placeholder="Search by client name, contact, email or phone..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="btn btn-link text-muted position-absolute top-50 end-0 translate-middle-y me-2 p-0"
                                            onClick={() => setSearchTerm('')}
                                        >
                                            <FiX size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="col-md-5 col-lg-6 text-md-end text-muted fs-12">
                                {loading ? (
                                    <span>Refreshing clients directory…</span>
                                ) : (
                                    <span>
                                        Showing <strong className="text-dark">{clients.length}</strong> of{' '}
                                        <strong className="text-dark">{meta.total}</strong> client accounts
                                        {searchTerm && ` matching "${searchTerm}"`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card-body p-4">
                        {error && (
                            <div className="alert alert-danger rounded-3 mb-4 d-flex align-items-center gap-2">
                                <FiInfo size={16} />
                                <div>{error}</div>
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner label="Loading clients directory..." variant="spinner" />
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="text-center py-5">
                                <div className="avatar-text avatar-xl bg-soft-primary text-primary mx-auto mb-3 rounded-circle">
                                    <FiBriefcase size={28} />
                                </div>
                                <h5 className="fw-bold mb-1">No clients found</h5>
                                <p className="text-muted fs-13 mb-3">
                                    {searchTerm || statusFilter
                                        ? 'No clients match your filter criteria. Try adjusting your search term or status.'
                                        : 'No client organizations have been added yet.'}
                                </p>
                                {(searchTerm || statusFilter) && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 me-2"
                                        onClick={() => {
                                            setSearchTerm('')
                                            setStatusFilter('')
                                        }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                {canCreate && (
                                    <Link href="/clients/create" className="btn btn-sm btn-primary rounded-pill px-3">
                                        <FiPlus className="me-1" /> Add New Client
                                    </Link>
                                )}
                            </div>
                        ) : viewMode === 'table' ? (
                            /* ── Modern Table View ── */
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light-subtle fs-12 text-uppercase text-muted border-top border-bottom">
                                        <tr>
                                            <th className="py-3 ps-3" style={{ width: '50px' }}>#</th>
                                            <th className="py-3">Client Organization</th>
                                            <th className="py-3">Primary Contact</th>
                                            <th className="py-3">Contact Details</th>
                                            <th className="py-3 text-center">Companies</th>
                                            <th className="py-3">Status</th>
                                            <th className="py-3">Created</th>
                                            <th className="py-3 text-end pe-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map((client, index) => {
                                            const palette = getAvatarStyle(client.name)
                                            const initials = getInitials(client.name)
                                            const encrypted = encryptId(client.id)

                                            return (
                                                <tr key={client.id} className="transition-all">
                                                    <td className="ps-3 text-muted fs-12">
                                                        {startIndex + index + 1}
                                                    </td>

                                                    <td>
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className={`avatar-text avatar-md ${palette.bg} ${palette.text} fw-bold rounded-circle shadow-none flex-shrink-0`}>
                                                                {initials}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/clients/${encrypted}/view`}
                                                                    className="fw-bold text-dark d-block text-decoration-none hover-primary"
                                                                    title={client.name}
                                                                >
                                                                    {client.name}
                                                                </Link>
                                                                {client.address ? (
                                                                    <span className="text-muted fs-11 text-truncate d-block" title={client.address}>
                                                                        <FiMapPin size={11} className="me-1 text-muted" />
                                                                        {client.address}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted fs-11 fst-italic">No address on file</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {client.contact_person ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <FiUser size={13} className="text-muted" />
                                                                <span className="fw-semibold text-dark fs-13">
                                                                    {client.contact_person}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted fs-12">—</span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="d-flex flex-column gap-1 fs-12">
                                                            {client.email ? (
                                                                <div className="d-flex align-items-center gap-1.5">
                                                                    <a
                                                                        href={`mailto:${client.email}`}
                                                                        className="text-muted text-decoration-none hover-primary text-truncate"
                                                                        style={{ maxWidth: 190 }}
                                                                        title={client.email}
                                                                    >
                                                                        <FiMail size={12} className="me-1 text-primary" />
                                                                        {client.email}
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link p-0 text-muted opacity-50 hover-opacity-100"
                                                                        onClick={() => copyToClipboard(client.email, `email-${client.id}`)}
                                                                        title="Copy email"
                                                                    >
                                                                        {copiedKey === `email-${client.id}` ? (
                                                                            <FiCheck size={11} className="text-success" />
                                                                        ) : (
                                                                            <FiCopy size={11} />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : null}

                                                            {client.phone ? (
                                                                <div className="d-flex align-items-center gap-1.5">
                                                                    <a
                                                                        href={`tel:${client.phone}`}
                                                                        className="text-muted text-decoration-none hover-primary"
                                                                    >
                                                                        <FiPhone size={12} className="me-1 text-info" />
                                                                        {client.phone}
                                                                    </a>
                                                                </div>
                                                            ) : null}

                                                            {!client.email && !client.phone && (
                                                                <span className="text-muted fs-12">—</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="text-center">
                                                        <button
                                                            type="button"
                                                            className="badge bg-soft-primary text-primary fw-bold px-2.5 py-1.5 rounded-pill border-0"
                                                            onClick={() => setQuickViewClient(client)}
                                                            title="Click to view linked companies"
                                                        >
                                                            <FiLayers className="me-1" size={11} />
                                                            {client.companies_count ?? 0}
                                                        </button>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`badge rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1.5 ${
                                                                client.status === 'Active'
                                                                    ? 'bg-soft-success text-success'
                                                                    : 'bg-soft-secondary text-secondary'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`rounded-circle ${client.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}
                                                                style={{ width: 6, height: 6 }}
                                                            ></span>
                                                            {client.status || 'Active'}
                                                        </span>
                                                    </td>

                                                    <td className="fs-12 text-muted text-nowrap">
                                                        {client.created_at ? (
                                                            <span title={client.created_at}>
                                                                <FiCalendar size={12} className="me-1 text-muted" />
                                                                {formatDate(client.created_at)}
                                                            </span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <div className="d-flex gap-1 justify-content-end">
                                                            <button
                                                                type="button"
                                                                className="avatar-text avatar-sm border-0 bg-light text-muted hover-primary"
                                                                title="Quick Preview"
                                                                onClick={() => setQuickViewClient(client)}
                                                            >
                                                                <FiEye size={14} />
                                                            </button>

                                                            <Link
                                                                href={`/clients/${encrypted}/view`}
                                                                className="avatar-text avatar-sm border-0 bg-light text-muted hover-primary"
                                                                title="Full Client Overview"
                                                            >
                                                                <FiExternalLink size={14} />
                                                            </Link>

                                                            {hasPermission('edit-clients') && (
                                                                <Link
                                                                    href={`/clients/${encrypted}/edit`}
                                                                    className="avatar-text avatar-sm border-0 bg-light text-muted hover-primary"
                                                                    title="Edit Client"
                                                                >
                                                                    <FiEdit3 size={14} />
                                                                </Link>
                                                            )}

                                                            {isPlatform && hasPermission('delete-clients') && (
                                                                <button
                                                                    type="button"
                                                                    className="avatar-text avatar-sm border-0 bg-light text-danger hover-danger"
                                                                    title="Delete Client"
                                                                    onClick={() => handleDelete(client)}
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* ── Modern Card / Grid View ── */
                            <div className="row g-3">
                                {clients.map(client => {
                                    const palette = getAvatarStyle(client.name)
                                    const initials = getInitials(client.name)
                                    const encrypted = encryptId(client.id)

                                    return (
                                        <div key={client.id} className="col-xl-4 col-md-6">
                                            <div className="card h-100 border shadow-none rounded-4 hover-shadow transition-all overflow-hidden">
                                                <div className="card-body p-4 d-flex flex-column">
                                                    {/* Card Top */}
                                                    <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                                                        <div className="d-flex align-items-center gap-3 min-w-0">
                                                            <div className={`avatar-text avatar-lg ${palette.bg} ${palette.text} fw-bold rounded-circle shadow-none flex-shrink-0`}>
                                                                {initials}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/clients/${encrypted}/view`}
                                                                    className="fw-bold fs-15 text-dark text-truncate d-block text-decoration-none hover-primary"
                                                                    title={client.name}
                                                                >
                                                                    {client.name}
                                                                </Link>
                                                                <span className="text-muted fs-12 text-truncate d-block">
                                                                    {client.contact_person ? `Attn: ${client.contact_person}` : 'No contact specified'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`badge rounded-pill px-2.5 py-1 ${
                                                                client.status === 'Active'
                                                                    ? 'bg-soft-success text-success'
                                                                    : 'bg-soft-secondary text-secondary'
                                                            }`}
                                                        >
                                                            {client.status || 'Active'}
                                                        </span>
                                                    </div>

                                                    {/* Contact & Meta */}
                                                    <div className="d-flex flex-column gap-2 py-3 border-top border-bottom my-2 fs-12 text-muted">
                                                        {client.email && (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <FiMail className="text-primary flex-shrink-0" size={13} />
                                                                <a
                                                                    href={`mailto:${client.email}`}
                                                                    className="text-muted text-decoration-none text-truncate hover-primary"
                                                                    title={client.email}
                                                                >
                                                                    {client.email}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {client.phone && (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <FiPhone className="text-info flex-shrink-0" size={13} />
                                                                <a href={`tel:${client.phone}`} className="text-muted text-decoration-none hover-primary">
                                                                    {client.phone}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {client.address && (
                                                            <div className="d-flex align-items-start gap-2">
                                                                <FiMapPin className="text-danger flex-shrink-0 mt-0.5" size={13} />
                                                                <span className="text-truncate" title={client.address}>
                                                                    {client.address}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="d-flex align-items-center justify-content-between pt-1">
                                                            <span className="d-flex align-items-center gap-1.5">
                                                                <FiLayers className="text-primary" size={13} />
                                                                <span>Linked Entities:</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="badge bg-soft-primary text-primary fw-bold px-2 py-0.5 rounded-pill border-0"
                                                                onClick={() => setQuickViewClient(client)}
                                                            >
                                                                {client.companies_count ?? 0} Companies
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Card Footer Actions */}
                                                    <div className="mt-auto pt-2 d-flex align-items-center justify-content-between">
                                                        <Link
                                                            href={`/clients/${encrypted}/view`}
                                                            className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold"
                                                        >
                                                            Overview →
                                                        </Link>

                                                        <div className="d-flex gap-1">
                                                            <button
                                                                type="button"
                                                                className="avatar-text avatar-sm border-0 bg-light text-muted hover-primary"
                                                                title="Quick Preview"
                                                                onClick={() => setQuickViewClient(client)}
                                                            >
                                                                <FiEye size={13} />
                                                            </button>

                                                            {hasPermission('edit-clients') && (
                                                                <Link
                                                                    href={`/clients/${encrypted}/edit`}
                                                                    className="avatar-text avatar-sm border-0 bg-light text-muted hover-primary"
                                                                    title="Edit Client"
                                                                >
                                                                    <FiEdit3 size={13} />
                                                                </Link>
                                                            )}

                                                            {isPlatform && hasPermission('delete-clients') && (
                                                                <button
                                                                    type="button"
                                                                    className="avatar-text avatar-sm border-0 bg-light text-danger hover-danger"
                                                                    title="Delete Client"
                                                                    onClick={() => handleDelete(client)}
                                                                >
                                                                    <FiTrash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Pagination Bar */}
                        {meta.last_page > 1 && (
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-4 border-top mt-4">
                                <span className="text-muted fs-13">
                                    Showing page <strong className="text-dark">{meta.current_page}</strong> of{' '}
                                    <strong className="text-dark">{meta.last_page}</strong> ({meta.total} total clients)
                                </span>

                                <div className="d-flex align-items-center gap-1">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                        disabled={loading || meta.current_page <= 1}
                                        onClick={() => goToPage(meta.current_page - 1)}
                                    >
                                        &larr; Previous
                                    </button>

                                    {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 1)
                                        .map((p, idx, arr) => {
                                            const showEllipsis = idx > 0 && p - arr[idx - 1] > 1
                                            return (
                                                <React.Fragment key={p}>
                                                    {showEllipsis && <span className="px-1 text-muted">…</span>}
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm rounded-circle px-0 ${
                                                            p === meta.current_page
                                                                ? 'btn-primary text-white fw-bold'
                                                                : 'btn-light text-dark'
                                                        }`}
                                                        style={{ width: 32, height: 32 }}
                                                        onClick={() => goToPage(p)}
                                                        disabled={loading}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            )
                                        })}

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                        disabled={loading || meta.current_page >= meta.last_page}
                                        onClick={() => goToPage(meta.current_page + 1)}
                                    >
                                        Next &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick View Modal */}
            {quickViewClient && (
                <>
                    <div
                        className="modal fade show d-block"
                        tabIndex="-1"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1060 }}
                    >
                        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                {/* Modal Header */}
                                <div className="modal-header bg-light border-0 py-3 px-4">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={`avatar-text avatar-lg ${getAvatarStyle(quickViewClient.name).bg} ${getAvatarStyle(quickViewClient.name).text} fw-bold rounded-circle shadow-none`}>
                                            {getInitials(quickViewClient.name)}
                                        </div>
                                        <div>
                                            <h5 className="modal-title fw-bold text-dark mb-0">{quickViewClient.name}</h5>
                                            <span className="fs-12 text-muted">Client Quick Profile &amp; Practice Hierarchy</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={() => setQuickViewClient(null)}
                                    />
                                </div>

                                {/* Modal Body */}
                                <div className="modal-body p-4">
                                    <div className="row g-3 mb-4">
                                        <div className="col-sm-6">
                                            <div className="p-3 bg-light rounded-3 h-100">
                                                <span className="fs-11 fw-semibold text-muted text-uppercase d-block mb-1">
                                                    Status &amp; Verification
                                                </span>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className={`badge rounded-pill px-2.5 py-1 ${quickViewClient.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
                                                        {quickViewClient.status || 'Active'}
                                                    </span>
                                                    <span className="fs-12 text-muted">
                                                        Created {quickViewClient.created_at ? formatDate(quickViewClient.created_at) : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-sm-6">
                                            <div className="p-3 bg-light rounded-3 h-100">
                                                <span className="fs-11 fw-semibold text-muted text-uppercase d-block mb-1">
                                                    Primary Contact
                                                </span>
                                                <span className="fw-bold text-dark fs-14 d-block">
                                                    {quickViewClient.contact_person || 'Not Assigned'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="col-sm-6">
                                            <div className="p-3 bg-light rounded-3 h-100">
                                                <span className="fs-11 fw-semibold text-muted text-uppercase d-block mb-1">
                                                    Official Email
                                                </span>
                                                {quickViewClient.email ? (
                                                    <a href={`mailto:${quickViewClient.email}`} className="fw-semibold text-primary text-decoration-none">
                                                        {quickViewClient.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-muted fs-13">None</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-sm-6">
                                            <div className="p-3 bg-light rounded-3 h-100">
                                                <span className="fs-11 fw-semibold text-muted text-uppercase d-block mb-1">
                                                    Phone Contact
                                                </span>
                                                {quickViewClient.phone ? (
                                                    <a href={`tel:${quickViewClient.phone}`} className="fw-semibold text-dark text-decoration-none">
                                                        {quickViewClient.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-muted fs-13">None</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 bg-light rounded-3">
                                                <span className="fs-11 fw-semibold text-muted text-uppercase d-block mb-1">
                                                    Physical Address
                                                </span>
                                                <span className="text-dark fs-13">
                                                    {quickViewClient.address || 'No physical address on file'}
                                                </span>
                                            </div>
                                        </div>

                                        {quickViewClient.notes && (
                                            <div className="col-12">
                                                <div className="p-3 bg-light rounded-3">
                                                    <span className="fs-11 fw-semibold text-muted text-uppercase d-block mb-1">
                                                        Client Notes / Instructions
                                                    </span>
                                                    <span className="text-dark fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {quickViewClient.notes}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Associated Companies List */}
                                    <div className="mt-4">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                                <FiLayers className="text-primary" />
                                                Associated Companies &amp; Practices ({quickViewClient.companies?.length ?? quickViewClient.companies_count ?? 0})
                                            </h6>
                                        </div>

                                        {Array.isArray(quickViewClient.companies) && quickViewClient.companies.length > 0 ? (
                                            <div className="table-responsive border rounded-3">
                                                <table className="table table-hover align-middle mb-0">
                                                    <thead className="bg-light fs-12 text-muted">
                                                        <tr>
                                                            <th>Company Name</th>
                                                            <th>Status</th>
                                                            <th className="text-end">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {quickViewClient.companies.map(co => (
                                                            <tr key={co.id}>
                                                                <td className="fw-semibold text-dark">{co.name}</td>
                                                                <td>
                                                                    <span className={`badge ${co.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
                                                                        {co.status || 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="text-end">
                                                                    <Link
                                                                        href={`/companies/${encryptId(co.id)}/view`}
                                                                        className="btn btn-sm btn-light-brand py-1 px-2.5 fs-12"
                                                                    >
                                                                        Open Company &rarr;
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-light rounded-3 text-muted fs-13">
                                                No practice companies currently linked to this client organization.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="modal-footer bg-light border-0 py-3 px-4">
                                    <button
                                        type="button"
                                        className="btn btn-secondary rounded-pill px-4"
                                        onClick={() => setQuickViewClient(null)}
                                    >
                                        Close
                                    </button>
                                    {hasPermission('edit-clients') && (
                                        <Link
                                            href={`/clients/${encryptId(quickViewClient.id)}/edit`}
                                            className="btn btn-outline-primary rounded-pill px-4"
                                        >
                                            <FiEdit3 className="me-1" /> Edit Client
                                        </Link>
                                    )}
                                    <Link
                                        href={`/clients/${encryptId(quickViewClient.id)}/view`}
                                        className="btn btn-primary rounded-pill px-4"
                                    >
                                        <FiExternalLink className="me-1" /> Full Overview &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
                </>
            )}
        </PermissionGuard>
    )
}

export default ClientsListPage
