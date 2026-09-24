'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiEdit3 } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { encryptId } from '@/utils/encryptId'
import { INSURANCE_POLICY_STATUS_OPTIONS, INSURANCE_POLICY_STATUS_BADGE, formatStatusLabel } from '@/constants/credentialingOptions'
import { getExpiryStatus, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS } from '@/utils/expiryStatus'

const ExpiryCell = ({ date }) => {
    if (!date) return 'N/A'
    const status = getExpiryStatus(date)
    return (
        <div className="d-flex flex-column gap-1">
            <span>{date}</span>
            {status !== 'active' && (
                <span className={`badge bg-soft-${EXPIRY_STATUS_BADGE[status]} text-${EXPIRY_STATUS_BADGE[status]}`}>
                    {EXPIRY_STATUS_LABELS[status]}
                </span>
            )}
        </div>
    )
}

const page = () => {
    const router = useRouter()
    const [records, setRecords] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')
    const [expirationStatus, setExpirationStatus] = useState('')

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const params = {}
            if (search) params.search = search
            if (status) params.status = status
            if (expirationStatus) params.expiration_status = expirationStatus

            const response = await crmInstance.get('/medical-billing/credentialing-insurance-policies', { params })
            const data = response.data?.data
            setRecords(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load insurance policies. Please try again.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view insurance policies.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
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
    }, [search, status, expirationStatus])

    return (
        <PermissionGuard permission="medical_credentialing.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    <Link href="/medical-billing/credentialing/dashboard" className="btn btn-outline-primary">Dashboard</Link>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2 mb-3'>
                                    <div className="col-md-3">
                                        <label className="form-label small text-muted">Status</label>
                                        <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                                            <option value="">All</option>
                                            {INSURANCE_POLICY_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small text-muted">Expiration</label>
                                        <select className="form-select form-select-sm" value={expirationStatus} onChange={(e) => setExpirationStatus(e.target.value)}>
                                            <option value="">All</option>
                                            <option value="expiring_soon">Expiring Soon</option>
                                            <option value="expired">Expired</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small text-muted">Search</label>
                                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Provider name or insurance company..." className="form-control form-control-sm" />
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} polic${total === 1 ? 'y' : 'ies'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Provider</th>
                                                <th>Insurance Company</th>
                                                <th>Policy Type</th>
                                                <th>Policy Number</th>
                                                <th>Effective</th>
                                                <th>Expiration</th>
                                                <th>Coverage Limit</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        <Spinner label="Loading insurance policies..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">No insurance policies found.</td>
                                                </tr>
                                            ) : (
                                                records.map(policy => (
                                                    <tr key={policy.id}>
                                                        <td>
                                                            {policy.credentialing?.provider ? (
                                                                <Link href={`/medical-billing/providers/profile/${encryptId(policy.credentialing.provider.id)}`}>
                                                                    {policy.credentialing.provider.first_name} {policy.credentialing.provider.last_name}
                                                                </Link>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>{policy.insurance_company}</td>
                                                        <td>{policy.policy_type || '—'}</td>
                                                        <td>{policy.policy_number || '—'}</td>
                                                        <td>{policy.effective_date || '—'}</td>
                                                        <td><ExpiryCell date={policy.expiration_date} /></td>
                                                        <td>{policy.coverage_limit || '—'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${INSURANCE_POLICY_STATUS_BADGE[policy.status] || 'secondary'} text-${INSURANCE_POLICY_STATUS_BADGE[policy.status] || 'secondary'} text-capitalize`}>
                                                                {formatStatusLabel(policy.status)}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            {policy.credentialing?.id && (
                                                                <Link href={`/medical-billing/credentialing/edit/${encryptId(policy.credentialing.id)}`} className="avatar-text avatar-md" title="Manage">
                                                                    <FiEdit3 />
                                                                </Link>
                                                            )}
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
