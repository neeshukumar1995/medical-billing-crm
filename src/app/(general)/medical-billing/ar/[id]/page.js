'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import { FiDollarSign, FiPlus } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { decryptId } from '@/utils/decryptId'
import { formatDate as formatDateBase } from '@/utils/formatDate'

const STATUS_COLORS = { open: 'danger', follow_up: 'warning', patient_balance: 'info', resolved: 'success', written_off: 'secondary' }

const formatDate = (value) => formatDateBase(value) || ''

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
            const response = await crmInstance.get(`/medical-billing/ar/${actualId}`)
            setAccount(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load AR account.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (actualId) fetchAccount() }, [actualId])

    const handleAddFollowup = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await crmInstance.post(`/medical-billing/ar/${actualId}/followups`, {
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
            fetchAccount()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add follow-up.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <PermissionGuard permission="medical_ar.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-secondary">
                        <i className="me-2">⬅️</i>
                        Back
                    </button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        {error && <div className="alert alert-danger">{error}</div>}

                        {loading ? (
                            <div className="d-flex justify-content-center py-5">
                                <Spinner label="Loading AR account..." variant="spinner" />
                            </div>
                        ) : account ? (
                            <>
                                <div className="card shadow-lg border-0 mb-4" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                            <FiDollarSign /> {account.claim?.claim_number}
                                            <span className={`badge bg-soft-${STATUS_COLORS[account.status] || 'secondary'} text-${STATUS_COLORS[account.status] || 'secondary'} text-capitalize ms-2`}>
                                                {account.status?.replace('_', ' ')}
                                            </span>
                                        </h2>
                                    </div>
                                    <div className="card-body pt-0">
                                        <div className="row g-4">
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
                                    </div>
                                </div>

                                <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h5 className="mb-0">Follow-ups</h5>
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
