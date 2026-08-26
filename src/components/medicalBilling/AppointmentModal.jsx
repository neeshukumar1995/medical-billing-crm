'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiUser, FiX, FiSave, FiCalendar } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const STATUS_COLORS = {
    scheduled: 'primary',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger',
    no_show: 'secondary',
}

const emptyForm = {
    patient_id: '',
    provider_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: '',
    reason: '',
    status: 'scheduled',
    notes: '',
    assigned_to: '',
}

const toFormData = (a) => ({
    patient_id: a.patient_id || '',
    provider_id: a.provider_id || '',
    appointment_date: a.appointment_date ? a.appointment_date.substring(0, 10) : '',
    appointment_time: a.appointment_time ? a.appointment_time.substring(0, 5) : '',
    appointment_type: a.appointment_type || '',
    reason: a.reason || '',
    status: a.status || 'scheduled',
    notes: a.notes || '',
    // GET /appointments/{id} eager-loads the assignedTo relation, and
    // Eloquent serializes that relation under the SAME snake_case key as the
    // raw FK column ("assigned_to") — so here it arrives as {id, name}, not
    // a plain id. Pull the id back out for the edit form's <select>.
    assigned_to: a.assigned_to?.id ?? a.assigned_to ?? '',
})

export default function AppointmentModal({ appointmentId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [appointment, setAppointment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [patients, setPatients] = useState([])
    const [providers, setProviders] = useState([])
    const [users, setUsers] = useState([])
    const [isSaving, setIsSaving] = useState(false)

    const loadAll = async () => {
        try {
            setLoading(true)
            const companyId = localStorage.getItem('companyId')
            const cid = companyId ? JSON.parse(companyId) : null
            const [apptRes, pRes, drRes, usRes] = await Promise.all([
                crmInstance.get(`/medical-billing/appointments/${appointmentId}`),
                crmInstance.get('/medical-billing/patients', { params: { per_page: 500 } }),
                crmInstance.get('/medical-billing/providers', { params: { per_page: 500 } }),
                cid ? crmInstance.get(`/users/${cid}`, { params: { all: 1 } }) : Promise.resolve({ data: [] }),
            ])
            const a = apptRes.data
            setAppointment(a)
            setFormData(toFormData(a))
            setPatients(pRes.data?.data || [])
            setProviders(drRes.data?.data || [])
            const usersData = usRes.data
            setUsers(Array.isArray(usersData) ? usersData : (usersData?.data || []))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load appointment data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (appointmentId) loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appointmentId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (appointment) setFormData(toFormData(appointment))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (appointment) setFormData(toFormData(appointment))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/appointments/${appointmentId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Appointment updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await loadAll()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update appointment'))
        } finally {
            setIsSaving(false)
        }
    }

    const patientRecord = appointment?.patient || patients.find(p => String(p.id) === String(appointment?.patient_id))
    const providerRecord = appointment?.provider || providers.find(p => String(p.id) === String(appointment?.provider_id))
    // appointment.assigned_to is the eager-loaded {id, name} object here
    // (see toFormData above) — no need to cross-reference the users list.
    const assignedUser = appointment?.assigned_to || null

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiCalendar />
                                {mode === 'edit' ? 'Edit Appointment' : 'Appointment Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading appointment..." variant="spinner" />
                                </div>
                            ) : !appointment ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {patientRecord ? `${patientRecord.first_name} ${patientRecord.last_name}` : 'Patient'}
                                                <span className={`badge bg-soft-${STATUS_COLORS[appointment.status] || 'secondary'} text-${STATUS_COLORS[appointment.status] || 'secondary'} text-capitalize ms-2`}>
                                                    {appointment.status?.replace('_', ' ')}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">{appointment.appointment_date} {appointment.appointment_time}</p>
                                        </div>
                                        {hasPermission('medical_appointments.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Patient" value={patientRecord ? `${patientRecord.first_name} ${patientRecord.last_name}${patientRecord.patient_number ? ` (${patientRecord.patient_number})` : ''}` : null} />
                                        <Field label="Provider" value={providerRecord ? `${providerRecord.first_name} ${providerRecord.last_name}` : null} />
                                        <Field label="Date" value={appointment.appointment_date} />
                                        <Field label="Time" value={appointment.appointment_time} />
                                        <Field label="Type" value={appointment.appointment_type} />
                                        <Field label="Assigned To" value={assignedUser?.name} />
                                        <div className="col-md-12">
                                            <div className="text-muted small">Reason</div>
                                            <div className="fw-semibold">{appointment.reason || <span className="text-muted">—</span>}</div>
                                        </div>
                                        <div className="col-md-12">
                                            <div className="text-muted small">Notes</div>
                                            <div className="fw-semibold">{appointment.notes || <span className="text-muted">—</span>}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <form id="appointment-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Patient <span className="text-danger">*</span></label>
                                            <select name="patient_id" className="form-select" value={formData.patient_id} onChange={handleInputChange} required disabled={isSaving}>
                                                <option value="">Select patient</option>
                                                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Provider <span className="text-danger">*</span></label>
                                            <select name="provider_id" className="form-select" value={formData.provider_id} onChange={handleInputChange} required disabled={isSaving}>
                                                <option value="">Select provider</option>
                                                {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Date <span className="text-danger">*</span></label>
                                            <input type="date" name="appointment_date" className="form-control" value={formData.appointment_date} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Time <span className="text-danger">*</span></label>
                                            <input type="time" name="appointment_time" className="form-control" value={formData.appointment_time} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="no_show">No Show</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Type</label>
                                            <select name="appointment_type" className="form-select" value={formData.appointment_type} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="">Select</option>
                                                <option value="new-patient">New Patient</option>
                                                <option value="follow-up">Follow-up</option>
                                                <option value="consultation">Consultation</option>
                                                <option value="procedure">Procedure</option>
                                                <option value="telehealth">Telehealth</option>
                                            </select>
                                        </div>
                                        {hasPermission('medical_appointments.assign') && (
                                            <div className="col-md-4">
                                                <label className="form-label d-flex align-items-center gap-1"><FiUser size={14} /> Assigned To</label>
                                                <select name="assigned_to" className="form-select" value={formData.assigned_to} onChange={handleInputChange} disabled={isSaving}>
                                                    <option value="">Unassigned</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div className="col-md-12">
                                            <label className="form-label">Reason</label>
                                            <input type="text" name="reason" className="form-control" value={formData.reason} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Notes</label>
                                            <textarea name="notes" className="form-control" rows={3} value={formData.notes} onChange={handleInputChange} disabled={isSaving} />
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
                                    <button type="submit" form="appointment-modal-form" className="btn btn-primary" disabled={isSaving}>
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
        </>
    )
}
