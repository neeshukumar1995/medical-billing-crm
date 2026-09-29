'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiPlus } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDateTime } from '@/utils/formatDate'

const STATUS_BADGE = { checked: 'success', not_configured: 'secondary', error: 'danger' }

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [checks, setChecks] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [patients, setPatients] = useState([])
    const [payers, setPayers] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [patientId, setPatientId] = useState('')
    const [payerId, setPayerId] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState('')

    const fetchChecks = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get('/medical-billing/eligibility-checks')
            setChecks(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load eligibility checks.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view eligibility checks.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setChecks([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchChecks()
        ;(async () => {
            try {
                const response = await crmInstance.get('/medical-billing/patients', { params: { per_page: 500 } })
                setPatients(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        })()
        ;(async () => {
            try {
                const response = await crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 500 } })
                setPayers(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        })()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!patientId) return
        setSubmitting(true)
        setFormError('')
        try {
            const response = await crmInstance.post(`/medical-billing/patients/${patientId}/eligibility-checks`, {
                payer_id: payerId || null,
                notes: notes || null,
            })
            setChecks(prev => [response.data, ...prev])
            setPatientId('')
            setPayerId('')
            setNotes('')
            setShowForm(false)

            if (response.data.status === 'not_configured') {
                Swal.fire({
                    title: 'Recorded',
                    text: 'No clearinghouse vendor is configured yet — this check has been recorded as pending manual verification.',
                    icon: 'info',
                })
            } else {
                Swal.fire({
                    title: response.data.eligible ? 'Eligible' : 'Not Eligible',
                    text: response.data.plan_name ? `Plan: ${response.data.plan_name}` : undefined,
                    icon: response.data.eligible ? 'success' : 'warning',
                })
            }
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to run eligibility check.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <PermissionGuard permission="medical_eligibility.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_eligibility.manage') && (
                        <button onClick={() => setShowForm(prev => !prev)} className="btn btn-primary">
                            <FiPlus className="me-2" />
                            New Check
                        </button>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        {showForm && (
                            <div className="card mb-3">
                                <div className="card-body">
                                    {formError && <div className="alert alert-danger">{formError}</div>}
                                    <form onSubmit={handleSubmit}>
                                        <div className="row g-3 align-items-end">
                                            <div className="col-md-4">
                                                <label className="form-label">Patient <span className="text-danger">*</span></label>
                                                <select className="form-select" value={patientId} onChange={(e) => setPatientId(e.target.value)} required disabled={submitting}>
                                                    <option value="">Select patient</option>
                                                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Payer (optional — defaults to primary insurance)</label>
                                                <select className="form-select" value={payerId} onChange={(e) => setPayerId(e.target.value)} disabled={submitting}>
                                                    <option value="">Use patient's primary insurance</option>
                                                    {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label">Notes</label>
                                                <input type="text" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={submitting} />
                                            </div>
                                            <div className="col-md-1">
                                                <button type="submit" className="btn btn-primary w-100" disabled={submitting || !patientId}>
                                                    {submitting ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : 'Run'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <p className="text-muted small">Insurance eligibility check history. Most checks today record as "Not Configured" since no clearinghouse vendor is connected yet — that's still a useful record that a check was attempted.</p>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} check${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Patient</th>
                                                <th>Payer</th>
                                                <th>Checked</th>
                                                <th>Checked By</th>
                                                <th>Status</th>
                                                <th>Eligible</th>
                                                <th>Plan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading eligibility checks..." variant="spinner" /></td></tr>
                                            ) : checks.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No eligibility checks recorded yet.</td></tr>
                                            ) : (
                                                checks.map((c) => (
                                                    <tr key={c.id}>
                                                        <td>{c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'N/A'}</td>
                                                        <td>{c.payer?.name || 'N/A'}</td>
                                                        <td>{formatDateTime(c.created_at)}</td>
                                                        <td>{c.checked_by?.name || '—'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_BADGE[c.status] || 'secondary'} text-${STATUS_BADGE[c.status] || 'secondary'} text-capitalize`}>
                                                                {c.status.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {c.eligible === null ? '—' : (
                                                                <span className={`badge bg-soft-${c.eligible ? 'success' : 'danger'} text-${c.eligible ? 'success' : 'danger'}`}>
                                                                    {c.eligible ? 'Yes' : 'No'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>{c.plan_name || '—'}</td>
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
