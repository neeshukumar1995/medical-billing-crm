'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import { FiAlertCircle, FiPlus } from 'react-icons/fi'
import Swal from 'sweetalert2'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { decryptId } from '@/utils/decryptId'
import { formatDate } from '@/utils/formatDate'

const STATUS_COLORS = {
    open: 'danger', assigned: 'warning', in_review: 'info', corrected: 'primary',
    resubmitted: 'primary', resolved: 'success', written_off: 'secondary',
}

const Field = ({ label, value }) => (
    <div className="col-md-3">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])
    const { hasPermission } = usePermissions()

    const [denial, setDenial] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [showActionForm, setShowActionForm] = useState(false)
    const [actionType, setActionType] = useState('')
    const [actionNote, setActionNote] = useState('')
    const [newStatus, setNewStatus] = useState('')
    const [savingAction, setSavingAction] = useState(false)

    const fetchDenial = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/denials/${actualId}`)
            setDenial(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load denial.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (actualId) fetchDenial() }, [actualId])

    const handleAddAction = async (e) => {
        e.preventDefault()
        setSavingAction(true)
        try {
            await crmInstance.post(`/medical-billing/denials/${actualId}/actions`, {
                action_type: actionType,
                action_note: actionNote || null,
                new_status: newStatus || null,
            })
            setShowActionForm(false)
            setActionType('')
            setActionNote('')
            setNewStatus('')
            fetchDenial()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to add action.', icon: 'error' })
        } finally {
            setSavingAction(false)
        }
    }

    return (
        <PermissionGuard permission="medical_denials.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        {error && <div className="alert alert-danger">{error}</div>}

                        {loading ? (
                            <div className="d-flex justify-content-center py-5">
                                <Spinner label="Loading denial..." variant="spinner" />
                            </div>
                        ) : denial ? (
                            <>
                                <div className="card shadow-lg border-0 mb-4" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                            <FiAlertCircle /> Denial — {denial.claim?.claim_number}
                                            <span className={`badge bg-soft-${STATUS_COLORS[denial.status] || 'secondary'} text-${STATUS_COLORS[denial.status] || 'secondary'} text-capitalize ms-2`}>
                                                {denial.status?.replace('_', ' ')}
                                            </span>
                                        </h2>
                                    </div>
                                    <div className="card-body pt-0">
                                        <div className="row g-4">
                                            <Field label="Patient" value={denial.claim?.patient ? `${denial.claim.patient.first_name} ${denial.claim.patient.last_name}` : null} />
                                            <Field label="Denial Code" value={denial.denial_code} />
                                            <Field label="Denial Date" value={formatDate(denial.denial_date)} />
                                            <Field label="Assigned To" value={denial.assigned_to?.name} />
                                            <div className="col-md-12">
                                                <div className="text-muted small">Reason</div>
                                                <div className="fw-semibold">{denial.reason}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h5 className="mb-0">Work Log</h5>
                                            {hasPermission('medical_denials.manage') && !showActionForm && (
                                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowActionForm(true)}>
                                                    <FiPlus className="me-1" /> Add Action
                                                </button>
                                            )}
                                        </div>

                                        {showActionForm && (
                                            <form onSubmit={handleAddAction} className="border rounded p-3 mb-4">
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="form-label">Action Type <span className="text-danger">*</span></label>
                                                        <input type="text" className="form-control" placeholder="e.g. appeal_filed" value={actionType} onChange={(e) => setActionType(e.target.value)} required disabled={savingAction} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label">Update Status</label>
                                                        <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} disabled={savingAction}>
                                                            <option value="">No change</option>
                                                            <option value="open">Open</option>
                                                            <option value="assigned">Assigned</option>
                                                            <option value="in_review">In Review</option>
                                                            <option value="corrected">Corrected</option>
                                                            <option value="resubmitted">Resubmitted</option>
                                                            <option value="resolved">Resolved</option>
                                                            <option value="written_off">Written Off</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <label className="form-label">Note</label>
                                                        <textarea className="form-control" rows={2} value={actionNote} onChange={(e) => setActionNote(e.target.value)} disabled={savingAction} />
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-2 mt-3">
                                                    <button type="submit" className="btn btn-primary" disabled={savingAction}>{savingAction ? 'Saving...' : 'Save'}</button>
                                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowActionForm(false)} disabled={savingAction}>Cancel</button>
                                                </div>
                                            </form>
                                        )}

                                        {(!denial.actions || denial.actions.length === 0) ? (
                                            <p className="text-muted small">No actions logged yet.</p>
                                        ) : (
                                            <ul className="list-unstyled mb-0">
                                                {denial.actions.map(a => (
                                                    <li key={a.id} className="mb-2 pb-2 border-bottom">
                                                        <span className="fw-semibold text-capitalize">{a.action_type.replace('_', ' ')}</span>
                                                        <span className="text-muted small ms-2">{formatDate(a.action_date)}</span>
                                                        {a.action_note && <div className="text-muted small">{a.action_note}</div>}
                                                        {a.performed_by && <div className="text-muted small">by {a.performed_by.name}</div>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
