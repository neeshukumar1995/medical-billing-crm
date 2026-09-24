'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import { FiDollarSign, FiPlus, FiX } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate as formatDateBase } from '@/utils/formatDate'

const STATUS_COLORS = { open: 'danger', follow_up: 'warning', patient_balance: 'info', resolved: 'success', written_off: 'secondary' }

const formatDate = (value) => formatDateBase(value) || ''

const Field = ({ label, value }) => (
    <div className="col-md-3">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

export default function ArModal({ arId, onClose, onSaved }) {
    const { hasPermission } = usePermissions()

    const [account, setAccount] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [showForm, setShowForm] = useState(false)
    const [contactType, setContactType] = useState('')
    const [note, setNote] = useState('')
    const [nextFollowupDate, setNextFollowupDate] = useState('')
    const [newStatus, setNewStatus] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchAccount = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/ar/${arId}`)
            setAccount(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load AR account.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (arId) fetchAccount()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arId])

    const handleAddFollowup = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await crmInstance.post(`/medical-billing/ar/${arId}/followups`, {
                contact_type: contactType,
                note,
                next_followup_date: nextFollowupDate || null,
                status: newStatus || null,
            })
            setShowForm(false)
            setContactType('')
            setNote('')
            setNextFollowupDate('')
            setNewStatus('')
            await fetchAccount()
            onSaved && onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add follow-up.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiDollarSign />
                                AR Account
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading AR account..." variant="spinner" />
                                </div>
                            ) : account ? (
                                <>
                                    <h4 className="fw-bold d-flex align-items-center gap-2">
                                        {account.claim?.claim_number}
                                        <span className={`badge bg-soft-${STATUS_COLORS[account.status] || 'secondary'} text-${STATUS_COLORS[account.status] || 'secondary'} text-capitalize`}>
                                            {account.status?.replace('_', ' ')}
                                        </span>
                                    </h4>

                                    <div className="row g-4 mb-3">
                                        <Field label="Patient" value={account.patient ? `${account.patient.first_name} ${account.patient.last_name}` : null} />
                                        <Field label="Payer" value={account.payer?.name || 'Self-pay'} />
                                        <Field label="Aging" value={account.aging_bucket} />
                                        <Field
                                            label="Assigned To"
                                            value={account.assigned_to?.name
                                                ? account.assigned_to.name
                                                : account.patient?.assigned_to?.name
                                                    ? `${account.patient.assigned_to.name} (via patient)`
                                                    : 'Unassigned'}
                                        />
                                        <Field label="Insurance Balance" value={`$${Number(account.insurance_balance).toFixed(2)}`} />
                                        <Field label="Patient Balance" value={`$${Number(account.patient_balance).toFixed(2)}`} />
                                        <Field label="Total Balance" value={`$${Number(account.total_balance).toFixed(2)}`} />
                                    </div>

                                    <hr />

                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="mb-0">Follow-ups</h6>
                                        {hasPermission('medical_ar.manage') && !showForm && (
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowForm(true)}>
                                                <FiPlus className="me-1" /> Add Follow-up
                                            </button>
                                        )}
                                    </div>

                                    {showForm && (
                                        <form onSubmit={handleAddFollowup} className="border rounded p-3 mb-4">
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">Contact Type <span className="text-danger">*</span></label>
                                                    <select className="form-select" value={contactType} onChange={(e) => setContactType(e.target.value)} required disabled={saving}>
                                                        <option value="">Select</option>
                                                        <option value="phone">Phone</option>
                                                        <option value="portal">Payer Portal</option>
                                                        <option value="email">Email</option>
                                                        <option value="mail">Mail</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Next Follow-up Date</label>
                                                    <input type="date" className="form-control" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)} disabled={saving} />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Update Status</label>
                                                    <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} disabled={saving}>
                                                        <option value="">No change</option>
                                                        <option value="open">Open</option>
                                                        <option value="follow_up">Follow-up</option>
                                                        <option value="patient_balance">Patient Balance</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="written_off">Written Off</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label">Note <span className="text-danger">*</span></label>
                                                    <textarea className="form-control" rows={2} value={note} onChange={(e) => setNote(e.target.value)} required disabled={saving} />
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2 mt-3">
                                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                                            </div>
                                        </form>
                                    )}

                                    {(!account.followups || account.followups.length === 0) ? (
                                        <p className="text-muted small">No follow-ups logged yet.</p>
                                    ) : (
                                        <ul className="list-unstyled mb-0">
                                            {account.followups.map(f => (
                                                <li key={f.id} className="mb-2 pb-2 border-bottom">
                                                    <span className="fw-semibold text-capitalize">{f.contact_type}</span>
                                                    <span className="text-muted small ms-2">{formatDate(f.followup_date)}</span>
                                                    {f.next_followup_date && <span className="badge bg-soft-info text-info ms-2">Next: {formatDate(f.next_followup_date)}</span>}
                                                    <div className="text-muted small">{f.note}</div>
                                                    {f.assigned_to && <div className="text-muted small">assigned to {f.assigned_to.name}</div>}
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
