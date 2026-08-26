'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import { FiEdit3, FiUser, FiPlus, FiTrash2, FiShield, FiUsers, FiClock } from 'react-icons/fi'
import Link from 'next/link'
import Swal from 'sweetalert2'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyInsuranceForm = {
    payer_id: '',
    member_id: '',
    group_number: '',
    policy_number: '',
    subscriber_name: '',
    subscriber_relationship: 'self',
    effective_date: '',
    termination_date: '',
    is_primary: false,
    is_secondary: false,
}

const ACTION_LABELS = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    bulk_assign: 'Bulk assigned',
    assign_employee: 'Added team member',
    unassign_employee: 'Removed team member',
}

const formatActivityLabel = (action) => ACTION_LABELS[action] || action?.replace(/_/g, ' ')

const formatDateTime = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])
    const { hasPermission } = usePermissions()

    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [payers, setPayers] = useState([])
    const [showInsuranceForm, setShowInsuranceForm] = useState(false)
    const [insuranceForm, setInsuranceForm] = useState(emptyInsuranceForm)
    const [savingInsurance, setSavingInsurance] = useState(false)
    const [insuranceError, setInsuranceError] = useState('')

    const [companyUsers, setCompanyUsers] = useState([])
    const [showAssigneeForm, setShowAssigneeForm] = useState(false)
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
    const [savingAssignee, setSavingAssignee] = useState(false)
    const [assigneeError, setAssigneeError] = useState('')

    const [activityLogs, setActivityLogs] = useState([])
    const [loadingActivity, setLoadingActivity] = useState(true)

    const fetchPatient = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/patients/${actualId}`)
            setPatient(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load patient.')
        } finally {
            setLoading(false)
        }
    }

    const fetchActivity = async () => {
        try {
            setLoadingActivity(true)
            const response = await crmInstance.get('/medical-billing/audit-logs', {
                params: { record_id: actualId, module: 'medical_patients', per_page: 50 }
            })
            setActivityLogs(response.data?.data || [])
        } catch {
            // non-fatal — history panel just stays empty
        } finally {
            setLoadingActivity(false)
        }
    }

    useEffect(() => {
        if (actualId) {
            fetchPatient()
            fetchActivity()
        }
    }, [actualId])

    const openInsuranceForm = async () => {
        setShowInsuranceForm(true)
        if (payers.length === 0) {
            try {
                const response = await crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 1000, status: 'active' } })
                setPayers(response.data?.data || [])
            } catch {
                // non-fatal — dropdown will just be empty
            }
        }
    }

    const handleInsuranceChange = (e) => {
        const { name, value, type, checked } = e.target
        setInsuranceForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const handleAddInsurance = async (e) => {
        e.preventDefault()
        setSavingInsurance(true)
        setInsuranceError('')

        try {
            await crmInstance.post(`/medical-billing/patients/${actualId}/insurance`, insuranceForm)
            setShowInsuranceForm(false)
            setInsuranceForm(emptyInsuranceForm)
            await fetchPatient() // refresh list + primary/secondary flags
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setInsuranceError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to add insurance'))
        } finally {
            setSavingInsurance(false)
        }
    }

    const openAssigneeForm = async () => {
        setShowAssigneeForm(true)
        setAssigneeError('')
        if (companyUsers.length === 0) {
            try {
                const cid = localStorage.getItem('companyId')
                const parsedCid = cid ? JSON.parse(cid) : null
                if (!parsedCid) return
                const response = await crmInstance.get(`/users/${parsedCid}`, { params: { all: 1 } })
                setCompanyUsers(Array.isArray(response.data) ? response.data : (response.data?.data || []))
            } catch {
                // non-fatal — dropdown will just be empty
            }
        }
    }

    const handleAddAssignee = async (e) => {
        e.preventDefault()
        if (!selectedAssigneeId) return
        setSavingAssignee(true)
        setAssigneeError('')

        try {
            await crmInstance.post(`/medical-billing/patients/${actualId}/assignees`, { user_id: selectedAssigneeId })
            setShowAssigneeForm(false)
            setSelectedAssigneeId('')
            await fetchPatient()
            await fetchActivity()
        } catch (err) {
            setAssigneeError(err.response?.data?.message || 'Failed to add team member')
        } finally {
            setSavingAssignee(false)
        }
    }

    const handleRemoveAssignee = async (userId, userName) => {
        const result = await Swal.fire({
            title: 'Remove Team Member',
            text: `Remove ${userName} from this patient's team?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Remove',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/patients/${actualId}/assignees/${userId}`)
            await fetchPatient()
            await fetchActivity()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to remove team member.', icon: 'error' })
        }
    }

    const handleDeleteInsurance = async (insuranceId) => {
        const result = await Swal.fire({
            title: 'Remove Insurance Policy',
            text: 'Are you sure you want to remove this policy?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Remove',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/patients/${actualId}/insurance/${insuranceId}`)
            await fetchPatient()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to remove policy.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {patient && (
                        <Link href={`/medical-billing/patients/edit/${encryptId(patient.id)}`} className="btn btn-primary">
                            <FiEdit3 className="me-2" />
                            Edit
                        </Link>
                    )}
                    <button onClick={() => router.back()} className="btn btn-outline-primary">
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
                                <Spinner label="Loading patient..." variant="spinner" />
                            </div>
                        ) : patient ? (
                            <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                                <div className="card-body">
                                    <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                        <FiUser />
                                        {[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')}
                                        <span className={`badge bg-soft-${patient.status === 'active' ? 'success' : 'secondary'} text-${patient.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                            {patient.status}
                                        </span>
                                    </h2>
                                    <p className="text-muted mb-0">Patient # {patient.patient_number}</p>
                                </div>
                                <div className="card-body pt-0">
                                    <div className="row g-4">
                                        <Field label="Date of Birth" value={formatDate(patient.date_of_birth)} />
                                        <Field label="Gender" value={patient.gender} />
                                        <Field label="Phone" value={patient.phone} />
                                        <Field label="Email" value={patient.email} />
                                        <Field label="Address" value={patient.address} />
                                        <Field label="City" value={patient.city} />
                                        <Field label="State" value={patient.state} />
                                        <Field label="Zip Code" value={patient.zip_code} />
                                        <Field label="Emergency Contact" value={patient.emergency_contact_name} />
                                        <Field label="Emergency Contact Phone" value={patient.emergency_contact_phone} />
                                    </div>

                                    <hr className="my-4" />

                                    {/* ── Assigned Team ─────────────────────────────────── */}
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h5 className="mb-0 d-flex align-items-center gap-2"><FiUsers /> Assigned Team</h5>
                                        {hasPermission('medical_patients.assign') && !showAssigneeForm && (
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={openAssigneeForm}>
                                                <FiPlus className="me-1" /> Add Team Member
                                            </button>
                                        )}
                                    </div>

                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {patient.assigned_to?.name ? (
                                            <span className="badge bg-soft-info text-info px-3 py-2">
                                                {patient.assigned_to.name} <span className="fw-normal">(Primary)</span>
                                            </span>
                                        ) : (
                                            <span className="text-muted small">No primary assignee</span>
                                        )}
                                        {(patient.assignees || []).map(a => (
                                            <span key={a.id} className="badge bg-soft-secondary text-secondary px-3 py-2 d-inline-flex align-items-center gap-2">
                                                {a.name}
                                                {hasPermission('medical_patients.assign') && (
                                                    <button
                                                        type="button"
                                                        className="btn-close btn-close-sm"
                                                        style={{ fontSize: '0.55rem' }}
                                                        title="Remove"
                                                        onClick={() => handleRemoveAssignee(a.id, a.name)}
                                                    ></button>
                                                )}
                                            </span>
                                        ))}
                                    </div>

                                    {showAssigneeForm && (
                                        <form onSubmit={handleAddAssignee} className="border rounded p-3 mb-4 d-flex align-items-end gap-2">
                                            {assigneeError && <div className="alert alert-danger py-2 w-100">{assigneeError}</div>}
                                            <div className="flex-grow-1">
                                                <label className="form-label">Employee</label>
                                                <select className="form-select" value={selectedAssigneeId} onChange={(e) => setSelectedAssigneeId(e.target.value)} disabled={savingAssignee} required>
                                                    <option value="">Select employee</option>
                                                    {companyUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                            </div>
                                            <button type="submit" className="btn btn-primary" disabled={savingAssignee}>
                                                {savingAssignee ? 'Adding...' : 'Add'}
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowAssigneeForm(false); setAssigneeError('') }} disabled={savingAssignee}>
                                                Cancel
                                            </button>
                                        </form>
                                    )}

                                    <hr className="my-4" />

                                    {/* ── Insurance ─────────────────────────────────────── */}
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h5 className="mb-0 d-flex align-items-center gap-2"><FiShield /> Insurance</h5>
                                        {hasPermission('medical_patients.edit') && !showInsuranceForm && (
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={openInsuranceForm}>
                                                <FiPlus className="me-1" /> Add Policy
                                            </button>
                                        )}
                                    </div>

                                    {showInsuranceForm && (
                                        <form onSubmit={handleAddInsurance} className="border rounded p-3 mb-4">
                                            {insuranceError && <div className="alert alert-danger">{insuranceError}</div>}
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">Payer <span className="text-danger">*</span></label>
                                                    <select name="payer_id" className="form-select" value={insuranceForm.payer_id} onChange={handleInsuranceChange} required disabled={savingInsurance}>
                                                        <option value="">Select payer</option>
                                                        {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Member ID <span className="text-danger">*</span></label>
                                                    <input type="text" name="member_id" className="form-control" value={insuranceForm.member_id} onChange={handleInsuranceChange} required disabled={savingInsurance} />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Group Number</label>
                                                    <input type="text" name="group_number" className="form-control" value={insuranceForm.group_number} onChange={handleInsuranceChange} disabled={savingInsurance} />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Subscriber Name <span className="text-danger">*</span></label>
                                                    <input type="text" name="subscriber_name" className="form-control" value={insuranceForm.subscriber_name} onChange={handleInsuranceChange} required disabled={savingInsurance} />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Relationship</label>
                                                    <select name="subscriber_relationship" className="form-select" value={insuranceForm.subscriber_relationship} onChange={handleInsuranceChange} disabled={savingInsurance}>
                                                        <option value="self">Self</option>
                                                        <option value="spouse">Spouse</option>
                                                        <option value="child">Child</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Policy Number</label>
                                                    <input type="text" name="policy_number" className="form-control" value={insuranceForm.policy_number} onChange={handleInsuranceChange} disabled={savingInsurance} />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Effective Date</label>
                                                    <input type="date" name="effective_date" className="form-control" value={insuranceForm.effective_date} onChange={handleInsuranceChange} disabled={savingInsurance} />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Termination Date</label>
                                                    <input type="date" name="termination_date" className="form-control" value={insuranceForm.termination_date} onChange={handleInsuranceChange} disabled={savingInsurance} />
                                                </div>
                                                <div className="col-md-3 d-flex align-items-end">
                                                    <div className="form-check">
                                                        <input type="checkbox" name="is_primary" id="is_primary" className="form-check-input" checked={insuranceForm.is_primary} onChange={handleInsuranceChange} disabled={savingInsurance} />
                                                        <label htmlFor="is_primary" className="form-check-label">Primary</label>
                                                    </div>
                                                </div>
                                                <div className="col-md-3 d-flex align-items-end">
                                                    <div className="form-check">
                                                        <input type="checkbox" name="is_secondary" id="is_secondary" className="form-check-input" checked={insuranceForm.is_secondary} onChange={handleInsuranceChange} disabled={savingInsurance} />
                                                        <label htmlFor="is_secondary" className="form-check-label">Secondary</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2 mt-3">
                                                <button type="submit" className="btn btn-primary" disabled={savingInsurance}>
                                                    {savingInsurance ? 'Saving...' : 'Save Policy'}
                                                </button>
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowInsuranceForm(false); setInsuranceError('') }} disabled={savingInsurance}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {(!patient.insurances || patient.insurances.length === 0) ? (
                                        <p className="text-muted small">No insurance policies on file.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Payer</th>
                                                        <th>Member ID</th>
                                                        <th>Subscriber</th>
                                                        <th>Type</th>
                                                        <th>Status</th>
                                                        <th className="text-end">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {patient.insurances.map(ins => (
                                                        <tr key={ins.id}>
                                                            <td>{ins.payer?.name || 'N/A'}</td>
                                                            <td>{ins.member_id}</td>
                                                            <td>{ins.subscriber_name}</td>
                                                            <td>
                                                                {ins.is_primary && <span className="badge bg-soft-primary text-primary me-1">Primary</span>}
                                                                {ins.is_secondary && <span className="badge bg-soft-info text-info">Secondary</span>}
                                                            </td>
                                                            <td className="text-capitalize">{ins.status}</td>
                                                            <td className="text-end">
                                                                {hasPermission('medical_patients.edit') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Remove" onClick={() => handleDeleteInsurance(ins.id)}>
                                                                        <FiTrash2 />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <hr className="my-4" />

                                    {/* ── Appointments ──────────────────────────────────── */}
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h5 className="mb-0">Appointments</h5>
                                        {hasPermission('medical_appointments.manage') && (
                                            <Link href="/medical-billing/appointments/create" className="btn btn-sm btn-outline-primary">
                                                <FiPlus className="me-1" /> Schedule
                                            </Link>
                                        )}
                                    </div>
                                    {(!patient.appointments || patient.appointments.length === 0) ? (
                                        <p className="text-muted small">No appointments on file.</p>
                                    ) : (
                                        <div className="table-responsive mb-4">
                                            <table className="table table-sm table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Date / Time</th>
                                                        <th>Type</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {patient.appointments.map(a => (
                                                        <tr key={a.id}>
                                                            <td>{a.appointment_date} {a.appointment_time}</td>
                                                            <td className="text-capitalize">{a.appointment_type || 'N/A'}</td>
                                                            <td className="text-capitalize">{a.status?.replace('_', ' ')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* ── Encounters ────────────────────────────────────── */}
                                    <div className="d-flex align-items-center justify-content-between mb-3 mt-4">
                                        <h5 className="mb-0">Encounters</h5>
                                    </div>
                                    {(!patient.encounters || patient.encounters.length === 0) ? (
                                        <p className="text-muted small">No encounters on file.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Encounter #</th>
                                                        <th>Date</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {patient.encounters.map(enc => (
                                                        <tr key={enc.id}>
                                                            <td>{enc.encounter_number}</td>
                                                            <td>{enc.encounter_date}</td>
                                                            <td className="text-capitalize">{enc.status}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <hr className="my-4" />

                                    {/* ── Activity History ──────────────────────────────── */}
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h5 className="mb-0 d-flex align-items-center gap-2"><FiClock /> Activity History</h5>
                                    </div>
                                    {loadingActivity ? (
                                        <div className="d-flex justify-content-center py-3">
                                            <Spinner label="Loading activity..." variant="spinner" />
                                        </div>
                                    ) : activityLogs.length === 0 ? (
                                        <p className="text-muted small">No activity recorded for this patient yet.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>When</th>
                                                        <th>Employee</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activityLogs.map(log => (
                                                        <tr key={log.id}>
                                                            <td>{formatDateTime(log.created_at)}</td>
                                                            <td>{log.user_name || 'N/A'}</td>
                                                            <td className="text-capitalize">{formatActivityLabel(log.action)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
