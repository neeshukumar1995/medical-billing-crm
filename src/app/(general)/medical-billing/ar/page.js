'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEye } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import ArModal from '@/components/medicalBilling/ArModal'

const STATUS_COLORS = { open: 'danger', follow_up: 'warning', patient_balance: 'info', resolved: 'success', written_off: 'secondary' }
const BUCKET_COLORS = { '0-30': 'success', '31-60': 'warning', '61-90': 'danger', '90+': 'dark' }

const page = () => {
    const router = useRouter()
    const [accounts, setAccounts] = useState([])
    const [total, setTotal] = useState(0)
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [bucketFilter, setBucketFilter] = useState('')
    const [openArId, setOpenArId] = useState(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter
            if (bucketFilter) params.aging_bucket = bucketFilter

            const [arRes, summaryRes] = await Promise.all([
                crmInstance.get('/medical-billing/ar', { params }),
                crmInstance.get('/medical-billing/ar/summary'),
            ])
            setAccounts(arRes.data?.data || [])
            setTotal(arRes.data?.total ?? (arRes.data?.data?.length || 0))
            setSummary(summaryRes.data)
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load AR accounts.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setAccounts([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [statusFilter, bucketFilter])

    return (
        <PermissionGuard permission="medical_ar.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    {summary && (
                        <div className="col-lg-12 mb-3">
                            <div className="row g-3">
                                {summary.buckets.map(b => (
                                    <div className="col-md-3" key={b.bucket}>
                                        <div
                                            className={`card border-0 shadow-sm p-3 ${bucketFilter === b.bucket ? 'border border-primary' : ''}`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setBucketFilter(bucketFilter === b.bucket ? '' : b.bucket)}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className={`badge bg-soft-${BUCKET_COLORS[b.bucket]} text-${BUCKET_COLORS[b.bucket]}`}>{b.bucket} days</span>
                                                <span className="text-muted small">{b.count} accts</span>
                                            </div>
                                            <h4 className="mt-2 mb-0">${b.total.toFixed(2)}</h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='d-flex justify-content-end gap-2'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="open">Open</option>
                                                <option value="follow_up">Follow-up</option>
                                                <option value="patient_balance">Patient Balance</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="written_off">Written Off</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} account${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Claim #</th>
                                                <th>Patient</th>
                                                <th>Payer</th>
                                                <th>Insurance Bal</th>
                                                <th>Patient Bal</th>
                                                <th>Total</th>
                                                <th>Aging</th>
                                                <th>Status</th>
                                                <th>Assigned To</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="10" className="text-center py-4"><Spinner label="Loading AR..." variant="spinner" /></td></tr>
                                            ) : accounts.length === 0 ? (
                                                <tr><td colSpan="10" className="text-center py-4">No outstanding AR accounts.</td></tr>
                                            ) : (
                                                accounts.map((a) => (
                                                    <tr key={a.id}>
                                                        <td>{a.claim?.claim_number || 'N/A'}</td>
                                                        <td>{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'N/A'}</td>
                                                        <td>{a.payer?.name || 'Self-pay'}</td>
                                                        <td>${Number(a.insurance_balance).toFixed(2)}</td>
                                                        <td>${Number(a.patient_balance).toFixed(2)}</td>
                                                        <td><strong>${Number(a.total_balance).toFixed(2)}</strong></td>
                                                        <td>
                                                            <span className={`badge bg-soft-${BUCKET_COLORS[a.aging_bucket] || 'secondary'} text-${BUCKET_COLORS[a.aging_bucket] || 'secondary'}`}>
                                                                {a.aging_bucket}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[a.status] || 'secondary'} text-${STATUS_COLORS[a.status] || 'secondary'} text-capitalize`}>
                                                                {a.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {a.assigned_to?.name
                                                                ? <span className="badge bg-soft-info text-info">{a.assigned_to.name}</span>
                                                                : a.patient?.assigned_to?.name
                                                                    ? <span className="badge bg-soft-secondary text-secondary" title="Inherited from patient assignment">{a.patient.assigned_to.name} (via patient)</span>
                                                                    : <span className="text-muted small">Unassigned</span>}
                                                        </td>
                                                        <td className="text-end">
                                                            <button type="button" className="avatar-text avatar-md" title="View" onClick={() => setOpenArId(a.id)}>
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

            {openArId && (
                <ArModal
                    arId={openArId}
                    onClose={() => setOpenArId(null)}
                    onSaved={fetchData}
                />
            )}
        </PermissionGuard>
    )
}

export default page
