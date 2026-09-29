'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiEdit3, FiEye, FiTrash2, FiPlus, FiDownload, FiUpload } from 'react-icons/fi'
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

const PER_PAGE = 15

const page = () => {
    const { hasPermission } = usePermissions()
    const { isPlatform } = useUser()
    const [clients, setClients] = useState([])
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [currentPage, setCurrentPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [exporting, setExporting] = useState(false)
    const [showImport, setShowImport] = useState(false)

    const fetchClients = async (pageNo = currentPage) => {
        try {
            setLoading(true)
            const params = { page: pageNo, per_page: PER_PAGE }
            if (searchTerm) params.search = searchTerm
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
    }

    // Debounced reload when filters change (always back to page 1).
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1)
            fetchClients(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm, statusFilter])

    const goToPage = (pageNo) => {
        setCurrentPage(pageNo)
        fetchClients(pageNo)
    }

    const handleDelete = async (client) => {
        const result = await Swal.fire({
            title: 'Delete client?',
            text: client.companies_count > 0
                ? `"${client.name}" has ${client.companies_count} compan${client.companies_count === 1 ? 'y' : 'ies'}. They will NOT be deleted, only unlinked from this client.`
                : `"${client.name}" will be deleted permanently.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/clients/${client.id}`)
            Swal.fire({ title: 'Deleted!', text: 'Client deleted successfully', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchClients(clients.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage)
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete client', 'error')
        }
    }

    // Every client matching the current filters (not just this page), with
    // the names of its companies.
    const handleExport = async () => {
        setExporting(true)
        try {
            const params = { per_page: 5000, with_companies: 1 }
            if (searchTerm) params.search = searchTerm
            if (statusFilter) params.status = statusFilter
            const { data } = await crmInstance.get('/clients', { params })
            exportToExcel('Clients', [{
                name: 'Clients',
                rows: (data.data || []).map(c => ({
                    'Client Name': c.name,
                    'Contact Person': c.contact_person || '',
                    'Email': c.email || '',
                    'Phone': c.phone || '',
                    'Address': c.address || '',
                    'Status': c.status,
                    'Companies': c.companies_count,
                    'Company Names': (c.companies || []).map(co => co.name).join(', '),
                    'Notes': c.notes || '',
                    'Created': c.created_at ? formatDate(c.created_at) : '',
                })),
            }])
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Export failed', 'error')
        } finally {
            setExporting(false)
        }
    }

    const startIndex = (meta.current_page - 1) * PER_PAGE
    const canImport = isPlatform && hasPermission('create-clients')

    return (
        <PermissionGuard permission="view-clients">
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button type="button" className="btn btn-light-brand" onClick={handleExport} disabled={exporting}>
                        <FiDownload size={16} className='me-2' />
                        <span>{exporting ? 'Exporting...' : 'Export'}</span>
                    </button>
                    {canImport && (
                        <button type="button" className="btn btn-light-brand" onClick={() => setShowImport(true)}>
                            <FiUpload size={16} className='me-2' />
                            <span>Import</span>
                        </button>
                    )}
                    {isPlatform && hasPermission('create-clients') && (
                        <Link href="/clients/create" className="btn btn-primary">
                            <FiPlus size={16} className='me-2' />
                            <span>Create Client</span>
                        </Link>
                    )}
                </div>
            </PageHeader>
            {showImport && (
                <SpreadsheetImportModal
                    title="Import Clients"
                    endpoint="/clients/import"
                    columnsHelp="Columns: name (required), contact_person, email, phone, address, status (Active / Inactive), notes. A client whose name already exists is skipped."
                    template={{
                        fileName: 'clients_import_template',
                        headers: ['name', 'contact_person', 'email', 'phone', 'address', 'status', 'notes'],
                        example: ['ABC Health Group', 'Ravi Kumar', 'ravi@abchealth.com', '9876543210', 'Delhi', 'Active', ''],
                    }}
                    onClose={() => setShowImport(false)}
                    onImported={() => fetchClients(1)}
                />
            )}
            <div className='main-content'>
                <div className="card">
                    <div className="card-body">
                        {error && <div className="alert alert-danger">{error}</div>}

                        <div className="row g-2 mb-3">
                            <div className="col-md-6">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by name, contact, email or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-muted small mb-2">
                            {loading ? 'Loading…' : `Total: ${meta.total} client${meta.total === 1 ? '' : 's'}`}
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover dataTable no-footer">
                                <thead>
                                    <tr>
                                        <th>S.No</th>
                                        <th>Client Name</th>
                                        <th>Contact Person</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Companies</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-4">
                                                <Spinner classNames={{ label: "text-foreground mt-2" }} label="Loading clients..." variant="spinner" />
                                            </td>
                                        </tr>
                                    ) : clients.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-4">
                                                {searchTerm || statusFilter ? 'No clients found matching your filters.' : 'No clients yet.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map((client, index) => (
                                            <tr key={client.id}>
                                                <td>{startIndex + index + 1}</td>
                                                <td>
                                                    <Link href={`/clients/${encryptId(client.id)}/view`} className="fw-semibold">
                                                        {client.name}
                                                    </Link>
                                                </td>
                                                <td>{client.contact_person || '-'}</td>
                                                <td>{client.email || '-'}</td>
                                                <td>{client.phone || '-'}</td>
                                                <td><span className="badge bg-soft-primary text-primary">{client.companies_count}</span></td>
                                                <td>
                                                    <span className={`badge ${client.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
                                                        {client.status}
                                                    </span>
                                                </td>
                                                <td>{client.created_at ? formatDate(client.created_at) : '-'}</td>
                                                <td className="text-end">
                                                    <div className="d-flex gap-2 justify-content-end">
                                                        <Link href={`/clients/${encryptId(client.id)}/view`} className="avatar-text avatar-md" title="View">
                                                            <FiEye />
                                                        </Link>
                                                        {hasPermission('edit-clients') && (
                                                            <Link href={`/clients/${encryptId(client.id)}/edit`} className="avatar-text avatar-md" title="Edit">
                                                                <FiEdit3 />
                                                            </Link>
                                                        )}
                                                        {isPlatform && hasPermission('delete-clients') && (
                                                            <button type="button" className="avatar-text avatar-md border-0" title="Delete" onClick={() => handleDelete(client)}>
                                                                <FiTrash2 />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {meta.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <span className="text-muted small">Page {meta.current_page} of {meta.last_page}</span>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-sm btn-outline-secondary" disabled={loading || meta.current_page <= 1}
                                        onClick={() => goToPage(meta.current_page - 1)}>
                                        Previous
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary" disabled={loading || meta.current_page >= meta.last_page}
                                        onClick={() => goToPage(meta.current_page + 1)}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
