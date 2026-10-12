'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiUser, FiX, FiSave, FiUsers, FiPlus, FiClock, FiEye } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate, formatDateTime as formatDateTimeBase, toInputDate, formatDateAndTime } from '@/utils/formatDate'

const SKIP_DIFF_FIELDS = ['updated_at', 'created_at', 'id', 'company_id']

const formatFieldLabel = (key) => key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}|$)/

const formatDiffValue = (value) => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'string' && ISO_DATE_RE.test(value)) return formatDate(value)
    return String(value)
}

/** Parses old_values/new_values (JSON-encoded text columns) and, for an
 *  'update' action, returns only the fields that actually changed; for
 *  create/delete/assign-style actions it just lists whatever side has data. */
const getLogChanges = (log) => {
    let oldVals = {}, newVals = {}
    try { oldVals = log.old_values ? JSON.parse(log.old_values) : {} } catch { oldVals = {} }
    try { newVals = log.new_values ? JSON.parse(log.new_values) : {} } catch { newVals = {} }

    if (log.action === 'update') {
        const keys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)])
        return [...keys]
            .filter(k => !SKIP_DIFF_FIELDS.includes(k) && JSON.stringify(oldVals[k]) !== JSON.stringify(newVals[k]))
            .map(k => ({ field: k, from: oldVals[k], to: newVals[k] }))
    }

    const source = Object.keys(newVals).length ? newVals : oldVals
    return Object.keys(source)
        .filter(k => !SKIP_DIFF_FIELDS.includes(k))
        .map(k => ({ field: k, from: oldVals[k], to: newVals[k] }))
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

const formatDateTime = (value) => formatDateTimeBase(value) || 'N/A'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyForm = {
    patient_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    status: 'active',
    assigned_to: '',
}

const toFormData = (p) => ({
    patient_number: p.patient_number || '',
    first_name: p.first_name || '',
    middle_name: p.middle_name || '',
    last_name: p.last_name || '',
    date_of_birth: toInputDate(p.date_of_birth),
    gender: p.gender || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    zip_code: p.zip_code || '',
    emergency_contact_name: p.emergency_contact_name || '',
    emergency_contact_phone: p.emergency_contact_phone || '',
    status: p.status || 'active',
    // GET /patients/{id} eager-loads the assignedTo relation, and Eloquent
    // serializes that relation under the SAME snake_case key as the raw FK
    // column ("assigned_to") — so here it arrives as {id, name}, not a plain
    // id. Pull the id back out for the edit form's <select>.
    assigned_to: p.assigned_to?.id ?? p.assigned_to ?? '',
})

export default function PatientModal({ patientId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [users, setUsers] = useState([])
    const [isSaving, setIsSaving] = useState(false)

    const [showAssigneeForm, setShowAssigneeForm] = useState(false)
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
    const [savingAssignee, setSavingAssignee] = useState(false)
    const [assigneeError, setAssigneeError] = useState('')

    const [activityLogs, setActivityLogs] = useState([])
    const [loadingActivity, setLoadingActivity] = useState(true)
    const [selectedLog, setSelectedLog] = useState(null)

    const fetchPatient = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/patients/${patientId}`)
            setPatient(response.data)
            setFormData(toFormData(response.data))
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
                params: { record_id: patientId, module: 'medical_patients', per_page: 50 }
            })
            setActivityLogs(response.data?.data || [])
        } catch {
            // non-fatal — history panel just stays empty
        } finally {
            setLoadingActivity(false)
        }
    }

    useEffect(() => {
        if (patientId) {
            fetchPatient()
            fetchActivity()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId])

    // Employee picker for "Assigned To" — same /users/{companyId} lookup used elsewhere.
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const companyId = localStorage.getItem('companyId')
                const cid = companyId ? JSON.parse(companyId) : null
                if (!cid) return
                const response = await crmInstance.get(`/users/${cid}`, { params: { all: 1 } })
                const usersData = response.data
                setUsers(Array.isArray(usersData) ? usersData : (usersData?.data || []))
            } catch (err) {
                console.error('Failed to fetch users:', err)
            }
        }
        fetchUsers()
    }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (patient) setFormData(toFormData(patient))
        setError('')
        setMode('edit')
    }

    const handleAddAssignee = async (e) => {
        e.preventDefault()
        if (!selectedAssigneeId) return
        setSavingAssignee(true)
        setAssigneeError('')

        try {
            await crmInstance.post(`/medical-billing/patients/${patientId}/assignees`, { user_id: selectedAssigneeId })
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
            await crmInstance.delete(`/medical-billing/patients/${patientId}/assignees/${userId}`)
            await fetchPatient()
            await fetchActivity()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to remove team member.', icon: 'error' })
        }
    }

    const handleCancelEdit = () => {
        if (patient) setFormData(toFormData(patient))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/patients/${patientId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Patient updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchPatient()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update patient'))
        } finally {
            setIsSaving(false)
        }
    }

    // patient.assigned_to is the eager-loaded {id, name} object here (see
    // toFormData above for why) — no need to cross-reference the users list.
    const assignedUser = patient?.assigned_to || null

    // Audit log old/new values store assigned_to as the raw user id (the
    // model's actual column, not the eager-loaded relation) — resolve it
    // against the same company users list the "Assigned To" picker uses so
    // the diff popup shows a name instead of a bare id.
    const resolveDiffValue = (field, value) => {
        if (['assigned_to', 'user_id'].includes(field) && value !== null && value !== undefined && value !== '') {
            const match = users.find(u => String(u.id) === String(value))
            if (match) return match.name
        }
        return formatDiffValue(value)
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiUser />
                                {mode === 'edit' ? 'Edit Patient' : 'Patient Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading patient..." variant="spinner" />
                                </div>
                            ) : !patient ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')}
                                                <span className={`badge bg-soft-${patient.status === 'active' ? 'success' : 'secondary'} text-${patient.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {patient.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">Patient # {patient.patient_number}</p>
                                        </div>
                                        {hasPermission('medical_patients.edit') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

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

                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="mb-0 d-flex align-items-center gap-2"><FiUsers /> Assigned Team</h6>
                                        {hasPermission('medical_patients.assign') && !showAssigneeForm && (
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowAssigneeForm(true)}>
                                                <FiPlus className="me-1" /> Add Team Member
                                            </button>
                                        )}
                                    </div>

                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {assignedUser?.name ? (
                                            <span className="badge bg-soft-info text-info px-3 py-2">
                                                {assignedUser.name} <span className="fw-normal">(Primary)</span>
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
                                        <form onSubmit={handleAddAssignee} className="border rounded p-3 mb-3 d-flex align-items-end gap-2">
                                            {assigneeError && <div className="alert alert-danger py-2 w-100">{assigneeError}</div>}
                                            <div className="flex-grow-1">
                                                <label className="form-label">Employee</label>
                                                <select className="form-select" value={selectedAssigneeId} onChange={(e) => setSelectedAssigneeId(e.target.value)} disabled={savingAssignee} required>
                                                    <option value="">Select employee</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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

                                    {patient.insurances && patient.insurances.length > 0 && (
                                        <>
                                            <hr className="my-4" />
                                            <h6 className="mb-2">Insurance</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Payer</th>
                                                            <th>Member ID</th>
                                                            <th>Subscriber</th>
                                                            <th>Type</th>
                                                            <th>Status</th>
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
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}

                                    {patient.appointments && patient.appointments.length > 0 && (
                                        <>
                                            <hr className="my-4" />
                                            <h6 className="mb-2">Recent Appointments</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Date / Time</th>
                                                            <th>Type</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                        {patient.appointments.slice(0, 5).map(a => (
                                                            <tr key={a.id}>
                                                                <td>{formatDateAndTime(a.appointment_date, a.appointment_time)}</td>
                                                                <td className="text-capitalize">{a.appointment_type || 'N/A'}</td>
                                                                <td className="text-capitalize">{a.status?.replace('_', ' ')}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}

                                    <hr className="my-4" />

                                    <h6 className="mb-2 d-flex align-items-center gap-2"><FiClock /> Activity History</h6>
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
                                                        <th className="text-end">Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activityLogs.map(log => (
                                                        <tr key={log.id}>
                                                            <td>{formatDateTime(log.created_at)}</td>
                                                            <td>{log.user_name || 'N/A'}</td>
                                                            <td className="text-capitalize">{formatActivityLabel(log.action)}</td>
                                                            <td className="text-end">
                                                                <button type="button" className="avatar-text avatar-md" title="View Details" onClick={() => setSelectedLog(log)}>
                                                                    <FiEye />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <form id="patient-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label">Patient Number <span className="text-danger">*</span></label>
                                            <input type="text" name="patient_number" className="form-control" value={formData.patient_number} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">First Name <span className="text-danger">*</span></label>
                                            <input type="text" name="first_name" className="form-control" value={formData.first_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Middle Name</label>
                                            <input type="text" name="middle_name" className="form-control" value={formData.middle_name} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Last Name <span className="text-danger">*</span></label>
                                            <input type="text" name="last_name" className="form-control" value={formData.last_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                                            <input type="date" name="date_of_birth" className="form-control" value={formData.date_of_birth} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Gender</label>
                                            <select name="gender" className="form-select" value={formData.gender} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="">Select</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Email</label>
                                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="deceased">Deceased</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        {hasPermission('medical_patients.assign') && (
                                            <div className="col-md-4">
                                                <label className="form-label d-flex align-items-center gap-1"><FiUser size={14} /> Assigned To</label>
                                                <select name="assigned_to" className="form-select" value={formData.assigned_to} onChange={handleInputChange} disabled={isSaving}>
                                                    <option value="">Unassigned</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div className="col-md-12">
                                            <label className="form-label">Address</label>
                                            <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">City</label>
                                            <input type="text" name="city" className="form-control" value={formData.city} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">State</label>
                                            <input type="text" name="state" className="form-control" value={formData.state} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Zip Code</label>
                                            <input type="text" name="zip_code" className="form-control" value={formData.zip_code} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Emergency Contact Name</label>
                                            <input type="text" name="emergency_contact_name" className="form-control" value={formData.emergency_contact_name} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Emergency Contact Phone</label>
                                            <input type="text" name="emergency_contact_phone" className="form-control" value={formData.emergency_contact_phone} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="modal-footer">
                            {mode === 'edit' ? (
                                <>
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                                        Cancel
                                    </button>
                                    <button type="submit" form="patient-modal-form" className="btn btn-primary" disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="me-2" />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                    <FiX className="me-2" />
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>

            {selectedLog && (
                <>
                    <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title d-flex align-items-center gap-2">
                                        <FiClock />
                                        {formatActivityLabel(selectedLog.action)}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setSelectedLog(null)} />
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted small mb-3">
                                        {formatDateTime(selectedLog.created_at)} &middot; by {selectedLog.user_name || 'N/A'}
                                    </p>

                                    {(() => {
                                        const changes = getLogChanges(selectedLog)
                                        if (changes.length === 0) {
                                            return <p className="text-muted small">No field-level details recorded for this action.</p>
                                        }
                                        return (
                                            <div className="table-responsive">
                                                <table className="table table-sm table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Field</th>
                                                            <th>From</th>
                                                            <th>To</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {changes.map(c => (
                                                            <tr key={c.field}>
                                                                <td className="fw-semibold">{formatFieldLabel(c.field)}</td>
                                                                <td className="text-muted">{resolveDiffValue(c.field, c.from)}</td>
                                                                <td>{resolveDiffValue(c.field, c.to)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )
                                    })()}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedLog(null)}>
                                        <FiX className="me-2" />
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
                </>
            )}
        </>
    )
}
