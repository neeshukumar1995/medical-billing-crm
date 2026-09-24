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
import { PAYER_ENROLLMENT_STATUS_OPTIONS, PAYER_ENROLLMENT_STATUS_BADGE, payerEnrollmentStatusLabel } from '@/constants/credentialingOptions'
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
    const [payers, setPayers] = useState([])
    const [payerId, setPayerId] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const response = await crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 500 } })
                setPayers(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        })()
    }, [])

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const params = {}
            if (search) params.search = search
            if (status) params.status = status
            if (payerId) params.payer_id = payerId

            const response = await crmInstance.get('/medical-billing/credentialing-payer-enrollments', { params })
            const data = response.data?.data
            setRecords(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load payer enrollments. Please try again.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view payer enrollments.'
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
    }, [search, status, payerId])

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
                                            {PAYER_ENROLLMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small text-muted">Payer</label>
                                        <select className="form-select form-select-sm" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                                            <option value="">All</option>
                                            {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small text-muted">Search</label>
                                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Provider name..." className="form-control form-control-sm" />
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} enrollment${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Provider</th>
                                                <th>Payer</th>
                                                <th>Status</th>
                                                <th>Enrollment Type</th>
                                                <th>Contract #</th>
                                                <th>Effective</th>
                                                <th>Expiration</th>
                                                <th>Next Follow-up</th>
                                                <th>Assigned To</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="10" className="text-center py-4">
                                                        <Spinner label="Loading payer enrollments..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan="10" className="text-center py-4">No payer enrollments found.</td>
                                                </tr>
                                            ) : (
                                                records.map(pe => (
                                                    <tr key={pe.id}>
                                                        <td>
                                                            {pe.credentialing?.provider ? (
                                                                <Link href={`/medical-billing/providers/profile/${encryptId(pe.credentialing.provider.id)}`}>
                                                                    {pe.credentialing.provider.first_name} {pe.credentialing.provider.last_name}
                                                                </Link>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>{pe.payer?.name || 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${PAYER_ENROLLMENT_STATUS_BADGE[pe.status] || 'secondary'} text-${PAYER_ENROLLMENT_STATUS_BADGE[pe.status] || 'secondary'}`}>
                                                                {payerEnrollmentStatusLabel(pe.status)}
                                                            </span>
                                                        </td>
                                                        <td>{pe.enrollment_type || '—'}</td>
                                                        <td>{pe.contract_number || '—'}</td>
                                                        <td>{pe.effective_date || '—'}</td>
                                                        <td><ExpiryCell date={pe.expiration_date} /></td>
                                                        <td>{pe.next_follow_up_date || '—'}</td>
                                                        <td>{pe.assigned_user?.name || '—'}</td>
                                                        <td className="text-end">
                                                            {pe.credentialing?.id && (
                                                                <Link href={`/medical-billing/credentialing/edit/${encryptId(pe.credentialing.id)}`} className="avatar-text avatar-md" title="Manage">
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
