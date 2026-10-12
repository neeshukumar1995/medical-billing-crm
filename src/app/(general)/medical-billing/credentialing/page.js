'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus, FiEye, FiX } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { encryptId } from '@/utils/encryptId'
import { PROVIDER_TYPE_OPTIONS } from '@/constants/providerOptions'
import { isExpiringSoon, getExpiryStatus, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS } from '@/utils/expiryStatus'
import {
    STATUS_BADGE, PSV_STATUS_BADGE, formatStatusLabel,
    PAYER_ENROLLMENT_STATUS_OPTIONS, FOLLOW_UP_BUCKET_OPTIONS, DOCUMENT_STATUS_OPTIONS,
} from '@/constants/credentialingOptions'
import { formatDate } from '@/utils/formatDate'

const page = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const [records, setRecords] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [providerType, setProviderType] = useState(searchParams.get('provider_type') || '')
    const [enrollmentStatus, setEnrollmentStatus] = useState(searchParams.get('enrollment_status') || '')
    const [followUpStatus, setFollowUpStatus] = useState(searchParams.get('follow_up_status') || '')
    const [documentStatus, setDocumentStatus] = useState(searchParams.get('document_status') || '')
    const [npi, setNpi] = useState('')
    const [taxId, setTaxId] = useState('')
    const [payerId, setPayerId] = useState('')
    const [assignedTo, setAssignedTo] = useState('')
    const [expirationFrom, setExpirationFrom] = useState('')
    const [expirationTo, setExpirationTo] = useState('')
    const [sortBy, setSortBy] = useState('')
    const [sortDir, setSortDir] = useState('desc')
    const [payers, setPayers] = useState([])
    const [users, setUsers] = useState([])

    useEffect(() => {
        (async () => {
            try {
                const response = await crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 500 } })
                setPayers(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        })()
        ;(async () => {
            try {
                const rawCid = localStorage.getItem('companyId')
                const cid = rawCid ? JSON.parse(rawCid) : null
                if (!cid) return
                const response = await crmInstance.get(`/users/${cid}`, { params: { all: 1 } })
                const userList = response.data
                setUsers(Array.isArray(userList) ? userList : [])
            } catch {
                // dropdown stays empty
            }
        })()
    }, [])

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm
            if (providerType) params.provider_type = providerType
            if (enrollmentStatus) params.enrollment_status = enrollmentStatus
            if (followUpStatus) params.follow_up_status = followUpStatus
            if (documentStatus) params.document_status = documentStatus
            if (npi) params.npi = npi
            if (taxId) params.tax_id = taxId
            if (payerId) params.payer_id = payerId
            if (assignedTo) params.assigned_to = assignedTo
            if (expirationFrom) params.expiration_date_from = expirationFrom
            if (expirationTo) params.expiration_date_to = expirationTo
            if (sortBy) { params.sort_by = sortBy; params.sort_dir = sortDir }

            const response = await crmInstance.get('/medical-billing/credentialing', { params })
            const data = response.data?.data
            setRecords(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load credentialing records. Please try again.'
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view credentialing records.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            setError(errorMessage)
            setRecords([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchRecords, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        searchTerm, providerType, enrollmentStatus, followUpStatus, documentStatus,
        npi, taxId, payerId, assignedTo, expirationFrom, expirationTo, sortBy, sortDir,
    ])

    const handleDelete = async (recordId, providerName) => {
        const result = await Swal.fire({
            title: 'Delete Credentialing Record',
            text: `Are you sure you want to delete the credentialing record for "${providerName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/credentialing/${recordId}`)
            setRecords(prev => prev.filter(r => r.id !== recordId))
            Swal.fire({
                title: 'Deleted!',
                text: `Credentialing record for "${providerName}" has been deleted.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to delete credentialing record.',
                icon: 'error'
            })
        }
    }

    const verificationSummary = (record) => {
        const list = Array.isArray(record.verifications) ? record.verifications : []
        if (list.length === 0) return 'N/A'
        const verifiedCount = list.filter(v => v.status === 'verified').length
        return `${verifiedCount} / ${list.length} Verified`
    }

    const openTasksCount = (record) => {
        const list = Array.isArray(record.tasks) ? record.tasks : []
        return list.filter(t => t.status !== 'completed').length
    }

    const expiringSoonCount = (record) => {
        let count = 0
        if (isExpiringSoon(record.expiration_date)) count++
        ;(record.verifications || []).forEach(v => { if (isExpiringSoon(v.expiration_date)) count++ })
        ;(record.documents || []).forEach(d => { if (isExpiringSoon(d.expiration_date)) count++ })
        ;(record.payer_enrollments || []).forEach(p => { if (isExpiringSoon(p.expiration_date)) count++ })
        return count
    }

    const activeFilters = [
        providerType && { key: 'providerType', label: `Provider Type: ${PROVIDER_TYPE_OPTIONS.find(o => o.value === providerType)?.label || providerType}`, clear: () => setProviderType('') },
        enrollmentStatus && { key: 'enrollmentStatus', label: `Enrollment Status: ${PAYER_ENROLLMENT_STATUS_OPTIONS.find(o => o.value === enrollmentStatus)?.label || enrollmentStatus}`, clear: () => setEnrollmentStatus('') },
        followUpStatus && { key: 'followUpStatus', label: `Follow-up: ${FOLLOW_UP_BUCKET_OPTIONS.find(o => o.value === followUpStatus)?.label || followUpStatus}`, clear: () => setFollowUpStatus('') },
        documentStatus && { key: 'documentStatus', label: `Document Status: ${DOCUMENT_STATUS_OPTIONS.find(o => o.value === documentStatus)?.label || documentStatus}`, clear: () => setDocumentStatus('') },
        searchTerm && { key: 'searchTerm', label: `Search: "${searchTerm}"`, clear: () => setSearchTerm('') },
        npi && { key: 'npi', label: `NPI: ${npi}`, clear: () => setNpi('') },
        taxId && { key: 'taxId', label: `Tax ID: ${taxId}`, clear: () => setTaxId('') },
        payerId && { key: 'payerId', label: `Payer: ${payers.find(p => String(p.id) === String(payerId))?.name || payerId}`, clear: () => setPayerId('') },
        assignedTo && { key: 'assignedTo', label: `Assigned: ${users.find(u => String(u.id) === String(assignedTo))?.name || assignedTo}`, clear: () => setAssignedTo('') },
        expirationFrom && { key: 'expirationFrom', label: `Expiration From: ${expirationFrom}`, clear: () => setExpirationFrom('') },
        expirationTo && { key: 'expirationTo', label: `Expiration To: ${expirationTo}`, clear: () => setExpirationTo('') },
    ].filter(Boolean)

    const clearAllFilters = () => {
        setProviderType(''); setEnrollmentStatus(''); setFollowUpStatus(''); setDocumentStatus('')
        setSearchTerm(''); setNpi(''); setTaxId(''); setPayerId(''); setAssignedTo('')
        setExpirationFrom(''); setExpirationTo('')
    }

    return (
        <PermissionGuard permission="medical_credentialing.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link href="/medical-billing/credentialing/dashboard" className="btn btn-outline-primary">Dashboard</Link>
                    <Link href="/medical-billing/credentialing/followups" className="btn btn-outline-primary">Follow-ups</Link>
                    {hasPermission('medical_credentialing.manage') && (
                        <Link href="/medical-billing/credentialing/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Credentialing Record
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2 mb-3'>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Provider Type</label>
                                        <select className="form-select form-select-sm" value={providerType} onChange={(e) => setProviderType(e.target.value)}>
                                            <option value="">All</option>
                                            {PROVIDER_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Enrollment Status</label>
                                        <select className="form-select form-select-sm" value={enrollmentStatus} onChange={(e) => setEnrollmentStatus(e.target.value)}>
                                            <option value="">All</option>
                                            {PAYER_ENROLLMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Follow-up Status</label>
                                        <select className="form-select form-select-sm" value={followUpStatus} onChange={(e) => setFollowUpStatus(e.target.value)}>
                                            <option value="">All</option>
                                            {FOLLOW_UP_BUCKET_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Document Status</label>
                                        <select className="form-select form-select-sm" value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value)}>
                                            <option value="">All</option>
                                            {DOCUMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small text-muted">Search</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder='Provider name or NPI...'
                                            className="form-control form-control-sm"
                                        />
                                    </div>
                                </div>

                                <div className='row gy-2 mb-3'>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">NPI</label>
                                        <input type="text" value={npi} onChange={(e) => setNpi(e.target.value)} className="form-control form-control-sm" />
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Tax ID / EIN</label>
                                        <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="form-control form-control-sm" />
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Payer / Insurance</label>
                                        <select className="form-select form-select-sm" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                                            <option value="">All</option>
                                            {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Assigned Staff</label>
                                        <select className="form-select form-select-sm" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                                            <option value="">All</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Expiration From</label>
                                        <input type="date" value={expirationFrom} onChange={(e) => setExpirationFrom(e.target.value)} className="form-control form-control-sm" />
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small text-muted">Expiration To</label>
                                        <input type="date" value={expirationTo} onChange={(e) => setExpirationTo(e.target.value)} className="form-control form-control-sm" />
                                    </div>
                                </div>

                                <div className='row gy-2 mb-3'>
                                    <div className="col-md-3">
                                        <label className="form-label small text-muted">Sort By</label>
                                        <select className="form-select form-select-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                            <option value="">Default (Newest)</option>
                                            <option value="provider_name">Provider Name</option>
                                            <option value="created_at">Created Date</option>
                                            <option value="expiration_date">Expiration Date</option>
                                            <option value="follow_up_date">Follow-up Date</option>
                                            <option value="status">Enrollment Status</option>
                                        </select>
                                    </div>
                                    {sortBy && (
                                        <div className="col-md-2">
                                            <label className="form-label small text-muted">Direction</label>
                                            <select className="form-select form-select-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                                                <option value="desc">Descending</option>
                                                <option value="asc">Ascending</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {activeFilters.length > 0 && (
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                                        <span className="text-muted small">Active filters:</span>
                                        {activeFilters.map(f => (
                                            <span key={f.key} className="badge bg-soft-primary text-primary d-inline-flex align-items-center gap-1 py-2 px-3">
                                                {f.label}
                                                <button
                                                    type="button"
                                                    className="btn-close"
                                                    style={{ fontSize: '0.6rem' }}
                                                    aria-label="Remove filter"
                                                    onClick={f.clear}
                                                ></button>
                                            </span>
                                        ))}
                                        <button type="button" className="btn btn-sm btn-link text-danger p-0 ms-2" onClick={clearAllFilters}>
                                            <FiX className="me-1" />Clear All
                                        </button>
                                    </div>
                                )}

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} record${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>Provider</th>
                                                <th>Status</th>
                                                <th>PSV Status</th>
                                                <th>Verifications</th>
                                                <th>Open Tasks</th>
                                                <th>Expiration Date</th>
                                                <th>Expiring Soon</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        <Spinner label="Loading credentialing records..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        {searchTerm ? 'No credentialing records found matching your search.' : 'No credentialing records found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                records.map((record, index) => (
                                                    <tr key={record.id}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            {record.provider ? (
                                                                <Link href={`/medical-billing/providers/profile/${encryptId(record.provider.id)}`}>
                                                                    {record.provider.first_name} {record.provider.last_name}
                                                                </Link>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_BADGE[record.status] || 'secondary'} text-${STATUS_BADGE[record.status] || 'secondary'}`}>
                                                                {formatStatusLabel(record.status)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge bg-soft-${PSV_STATUS_BADGE[record.psv_status] || 'secondary'} text-${PSV_STATUS_BADGE[record.psv_status] || 'secondary'}`}>
                                                                {formatStatusLabel(record.psv_status)}
                                                            </span>
                                                        </td>
                                                        <td>{verificationSummary(record)}</td>
                                                        <td>{openTasksCount(record)}</td>
                                                        <td>
                                                            {record.expiration_date ? (
                                                                <span className={isExpiringSoon(record.expiration_date) ? 'text-danger fw-semibold' : ''}>
                                                                    {formatDate(record.expiration_date)}
                                                                </span>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>
                                                            {expiringSoonCount(record) > 0 ? (
                                                                <span className="badge bg-soft-danger text-danger">{expiringSoonCount(record)} expiring</span>
                                                            ) : (
                                                                <span className="badge bg-soft-success text-success">OK</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {record.provider && (
                                                                    <Link href={`/medical-billing/providers/profile/${encryptId(record.provider.id)}`} className="avatar-text avatar-md" title="View">
                                                                        <FiEye />
                                                                    </Link>
                                                                )}
                                                                {hasPermission('medical_credentialing.manage') && (
                                                                    <Link href={`/medical-billing/credentialing/edit/${encryptId(record.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                        <FiEdit3 />
                                                                    </Link>
                                                                )}
                                                                {hasPermission('medical_credentialing.manage') && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        onClick={() => handleDelete(record.id, record.provider ? `${record.provider.first_name} ${record.provider.last_name}` : 'this provider')}
                                                                        title="Delete"
                                                                    >
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
