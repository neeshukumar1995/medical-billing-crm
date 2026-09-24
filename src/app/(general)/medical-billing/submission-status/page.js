'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEye, FiRefreshCw } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate } from '@/utils/formatDate'
import ClaimModal from '@/components/medicalBilling/ClaimModal'

const STATUS_COLORS = {
    submitted: 'primary', accepted: 'success', rejected: 'danger',
    pending: 'warning', denied: 'danger', partially_paid: 'warning',
    paid: 'success', closed: 'secondary',
}

// Everything except draft/ready/voided — a claim only shows up here once
// it's actually left the office and entered the submission/adjudication
// lifecycle.
const SUBMISSION_STATUSES = ['submitted', 'accepted', 'rejected', 'pending', 'denied', 'partially_paid', 'paid', 'closed']

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [claims, setClaims] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [checkingId, setCheckingId] = useState(null)
    const [openClaimId, setOpenClaimId] = useState(null)
    const [configured, setConfigured] = useState(true)

    const fetchClaims = async () => {
        try {
            setLoading(true)
            const params = { status: statusFilter ? [statusFilter] : SUBMISSION_STATUSES, per_page: 100 }
            const response = await crmInstance.get('/medical-billing/claims', { params })
            setClaims(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load claims.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setClaims([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchClaims() }, [statusFilter])

    const latestReason = (claim) => {
        const history = claim.status_history || []
        return history.length ? history[0].reason : '—'
    }

    const handleCheckStatus = async (claim) => {
        setCheckingId(claim.id)
        try {
            const response = await crmInstance.post(`/medical-billing/claims/${claim.id}/check-status`)
            setConfigured(response.data.configured)
            setClaims(prev => prev.map(c => c.id === claim.id ? response.data.claim : c))
            Swal.fire({
                title: response.data.configured ? 'Status Checked' : 'Not Configured',
                text: response.data.message || 'No clearinghouse vendor is configured yet — status can only be updated manually.',
                icon: response.data.configured ? 'success' : 'info',
                timer: response.data.configured ? 1500 : undefined,
                showConfirmButton: !response.data.configured,
            })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to check status.', icon: 'error' })
        } finally {
            setCheckingId(null)
        }
    }

    return (
        <PermissionGuard permission="medical_claims.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                {!configured && (
                                    <div className="alert alert-info">
                                        No clearinghouse vendor is configured yet — "Check Status" records that, and claim status can only be updated manually until one is connected.
                                    </div>
                                )}

                                <div className='row gy-2 mb-3'>
                                    <div className="col-sm-12 d-flex justify-content-end">
                                        <select className="form-select form-select-sm" style={{ width: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                            <option value="">All Submitted Claims</option>
                                            {SUBMISSION_STATUSES.map(s => (
                                                <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} claim${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Claim #</th>
                                                <th>Patient</th>
                                                <th>Payer</th>
                                                <th>Status</th>
                                                <th>Submitted At</th>
                                                <th>Last Status Note</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading claims..." variant="spinner" /></td></tr>
                                            ) : claims.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No submitted claims found.</td></tr>
                                            ) : (
                                                claims.map((c) => (
                                                    <tr key={c.id}>
                                                        <td>{c.claim_number}</td>
                                                        <td>{c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'N/A'}</td>
                                                        <td>{c.payer?.name || 'Self-pay'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[c.status] || 'secondary'} text-${STATUS_COLORS[c.status] || 'secondary'} text-capitalize`}>
                                                                {c.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td>{c.submitted_at ? formatDate(c.submitted_at) : '—'}</td>
                                                        <td className="text-truncate" style={{ maxWidth: 220 }} title={latestReason(c)}>{latestReason(c)}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_claims.submit') && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        title={configured ? 'Check Status' : 'Clearinghouse not configured — click to log a manual check anyway'}
                                                                        disabled={checkingId === c.id}
                                                                        onClick={() => handleCheckStatus(c)}
                                                                    >
                                                                        {checkingId === c.id ? (
                                                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                                        ) : (
                                                                            <FiRefreshCw />
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <button type="button" className="avatar-text avatar-md" title="View" onClick={() => setOpenClaimId(c.id)}>
                                                                    <FiEye />
                                                                </button>
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

            {openClaimId && (
                <ClaimModal
                    claimId={openClaimId}
                    onClose={() => setOpenClaimId(null)}
                    onSaved={fetchClaims}
                />
            )}
        </PermissionGuard>
    )
}

export default page
