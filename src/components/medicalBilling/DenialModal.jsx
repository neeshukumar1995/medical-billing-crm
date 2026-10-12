'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiAlertCircle, FiPlus, FiX } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
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

export default function DenialModal({ denialId, onClose, onSaved }) {
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
            const response = await crmInstance.get(`/medical-billing/denials/${denialId}`)
            setDenial(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load denial.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (denialId) fetchDenial()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [denialId])

    const handleAddAction = async (e) => {
        e.preventDefault()
        setSavingAction(true)
        try {
            await crmInstance.post(`/medical-billing/denials/${denialId}/actions`, {
                action_type: actionType,
                action_note: actionNote || null,
                new_status: newStatus || null,
            })
            setShowActionForm(false)
            setActionType('')
            setActionNote('')
            setNewStatus('')
            await fetchDenial()
            onSaved && onSaved()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to add action.', icon: 'error' })
        } finally {
            setSavingAction(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiAlertCircle />
                                Denial{denial?.claim?.claim_number ? ` — ${denial.claim.claim_number}` : ''}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading denial..." variant="spinner" />
                                </div>
                            ) : denial ? (
                                <>
                                    <h4 className="fw-bold d-flex align-items-center gap-2">
                                        {denial.claim?.claim_number}
                                        <span className={`badge bg-soft-${STATUS_COLORS[denial.status] || 'secondary'} text-${STATUS_COLORS[denial.status] || 'secondary'} text-capitalize`}>
                                            {denial.status?.replace('_', ' ')}
                                        </span>
                                    </h4>

                                    <div className="row g-4 mb-3">
                                        <Field label="Patient" value={denial.claim?.patient ? `${denial.claim.patient.first_name} ${denial.claim.patient.last_name}` : null} />
                                        <Field label="Denial Code" value={denial.denial_code} />
                                        <Field label="Denial Date" value={formatDate(denial.denial_date)} />
                                        <Field label="Assigned To" value={denial.assigned_to?.name} />
                                        <div className="col-md-12">
                                            <div className="text-muted small">Reason</div>
                                            <div className="fw-semibold">{denial.reason}</div>
                                        </div>
                                    </div>

                                    <hr />

                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="mb-0">Work Log</h6>
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
                                </>
                            ) : null}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                <FiX className="me-2" />
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}
