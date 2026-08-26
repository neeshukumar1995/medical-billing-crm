'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEye, FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import DenialModal from '@/components/medicalBilling/DenialModal'

const STATUS_COLORS = {
    open: 'danger', assigned: 'warning', in_review: 'info', corrected: 'primary',
    resubmitted: 'primary', resolved: 'success', written_off: 'secondary',
}

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [denials, setDenials] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [openDenialId, setOpenDenialId] = useState(null)

    const fetchDenials = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter
            const response = await crmInstance.get('/medical-billing/denials', { params })
            setDenials(response.data?.data || [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load denials.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setDenials([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchDenials() }, [statusFilter])

    return (
        <PermissionGuard permission="medical_denials.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_denials.manage') && (
                        <Link href="/medical-billing/denials/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Log Denial
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

                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='d-flex justify-content-end'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="open">Open</option>
                                                <option value="assigned">Assigned</option>
                                                <option value="in_review">In Review</option>
                                                <option value="corrected">Corrected</option>
                                                <option value="resubmitted">Resubmitted</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="written_off">Written Off</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Claim #</th>
                                                <th>Patient</th>
                                                <th>Code</th>
                                                <th>Reason</th>
                                                <th>Assigned To</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="8" className="text-center py-4"><Spinner label="Loading denials..." variant="spinner" /></td></tr>
                                            ) : denials.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center py-4">No denials found.</td></tr>
                                            ) : (
                                                denials.map((d) => (
                                                    <tr key={d.id}>
                                                        <td>{d.denial_date}</td>
                                                        <td>{d.claim?.claim_number || 'N/A'}</td>
                                                        <td>{d.claim?.patient ? `${d.claim.patient.first_name} ${d.claim.patient.last_name}` : 'N/A'}</td>
                                                        <td>{d.denial_code || 'N/A'}</td>
                                                        <td className="text-truncate" style={{ maxWidth: 220 }}>{d.reason}</td>
                                                        <td>{d.assigned_to?.name || 'Unassigned'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[d.status] || 'secondary'} text-${STATUS_COLORS[d.status] || 'secondary'} text-capitalize`}>
                                                                {d.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <button type="button" className="avatar-text avatar-md" title="View" onClick={() => setOpenDenialId(d.id)}>
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

            {openDenialId && (
                <DenialModal
                    denialId={openDenialId}
                    onClose={() => setOpenDenialId(null)}
                    onSaved={fetchDenials}
                />
            )}
        </PermissionGuard>
    )
}

export default page
