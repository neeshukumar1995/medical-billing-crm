'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEye } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import ClaimModal from '@/components/medicalBilling/ClaimModal'

const STATUS_COLORS = {
    draft: 'secondary', ready: 'info', submitted: 'primary', accepted: 'success',
    rejected: 'danger', pending: 'warning', denied: 'danger',
    partially_paid: 'warning', paid: 'success', closed: 'secondary',
}

const page = () => {
    const router = useRouter()
    const [claims, setClaims] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [openClaimId, setOpenClaimId] = useState(null)

    const fetchClaims = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter
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

                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='d-flex justify-content-end'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="draft">Draft</option>
                                                <option value="ready">Ready</option>
                                                <option value="submitted">Submitted</option>
                                                <option value="accepted">Accepted</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="pending">Pending</option>
                                                <option value="denied">Denied</option>
                                                <option value="partially_paid">Partially Paid</option>
                                                <option value="paid">Paid</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
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
                                                <th>Provider</th>
                                                <th>Payer</th>
                                                <th>Total Charge</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading claims..." variant="spinner" /></td></tr>
                                            ) : claims.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No claims found.</td></tr>
                                            ) : (
                                                claims.map((c) => (
                                                    <tr key={c.id}>
                                                        <td>{c.claim_number}</td>
                                                        <td>{c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'N/A'}</td>
                                                        <td>{c.provider ? `${c.provider.first_name} ${c.provider.last_name}` : 'N/A'}</td>
                                                        <td>{c.payer?.name || 'Self-pay'}</td>
                                                        <td>${Number(c.total_charge).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[c.status] || 'secondary'} text-${STATUS_COLORS[c.status] || 'secondary'} text-capitalize`}>
                                                                {c.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <button type="button" className="avatar-text avatar-md" title="View" onClick={() => setOpenClaimId(c.id)}>
                                                                <FiEye />
                                                            </button>
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
