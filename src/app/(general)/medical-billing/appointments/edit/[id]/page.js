'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiEdit3, FiUser } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import { usePermissions } from '@/hooks/usePermissions'
import { toInputDate } from '@/utils/formatDate'

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

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])
    const { hasPermission } = usePermissions()

    const [formData, setFormData] = useState(emptyForm)
    const [patients, setPatients] = useState([])
    const [providers, setProviders] = useState([])
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setIsFetching(true)
                const companyId = localStorage.getItem('companyId')
                const cid = companyId ? JSON.parse(companyId) : null
                const [apptRes, pRes, drRes, usRes] = await Promise.all([
                    crmInstance.get(`/medical-billing/appointments/${actualId}`),
                    crmInstance.get('/medical-billing/patients', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/providers', { params: { per_page: 500 } }),
                    cid ? crmInstance.get(`/users/${cid}`, { params: { all: 1 } }) : Promise.resolve({ data: [] }),
                ])
                const a = apptRes.data
                setFormData({
                    patient_id: a.patient_id || '',
                    provider_id: a.provider_id || '',
                    appointment_date: toInputDate(a.appointment_date),
                    appointment_time: a.appointment_time ? a.appointment_time.substring(0, 5) : '',
                    appointment_type: a.appointment_type || '',
                    reason: a.reason || '',
                    status: a.status || 'scheduled',
                    notes: a.notes || '',
                    // GET /appointments/{id} eager-loads assignedTo, which
                    // Eloquent serializes under the same snake_case key as
                    // the raw FK column — arrives as {id, name}, not a
                    // plain id. Pull the id back out for the <select>.
                    assigned_to: a.assigned_to?.id ?? a.assigned_to ?? '',
                })
                setPatients(pRes.data?.data || [])
                setProviders(drRes.data?.data || [])
                const usersData = usRes.data
                setUsers(Array.isArray(usersData) ? usersData : (usersData?.data || []))
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load appointment data.')
            } finally {
                setIsFetching(false)
            }
        }

        if (actualId) load()
    }, [actualId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/appointments/${actualId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Appointment updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/appointments')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update appointment'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_appointments.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary">
                        <i className="me-2">⬅️</i>
                        Back
                    </button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FiEdit3 /> Edit Appointment
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5">
                                        <Spinner label="Loading appointment..." variant="spinner" />
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className="row g-4">
                                            <div className="col-md-6">
                                                <label className="form-label">Patient <span className="text-danger">*</span></label>
                                                <select name="patient_id" className="form-select" value={formData.patient_id} onChange={handleInputChange} required disabled={isLoading}>
                                                    <option value="">Select patient</option>
                                                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Provider <span className="text-danger">*</span></label>
                                                <select name="provider_id" className="form-select" value={formData.provider_id} onChange={handleInputChange} required disabled={isLoading}>
                                                    <option value="">Select provider</option>
                                                    {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Date <span className="text-danger">*</span></label>
                                                <input type="date" name="appointment_date" className="form-control" value={formData.appointment_date} onChange={handleInputChange} required disabled={isLoading} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Time <span className="text-danger">*</span></label>
                                                <input type="time" name="appointment_time" className="form-control" value={formData.appointment_time} onChange={handleInputChange} required disabled={isLoading} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Status</label>
                                                <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="scheduled">Scheduled</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                    <option value="no_show">No Show</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Type</label>
                                                <select name="appointment_type" className="form-select" value={formData.appointment_type} onChange={handleInputChange} disabled={isLoading}>
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
                                                    <select name="assigned_to" className="form-select" value={formData.assigned_to} onChange={handleInputChange} disabled={isLoading}>
                                                        <option value="">Unassigned</option>
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="col-md-12">
                                                <label className="form-label">Reason</label>
                                                <input type="text" name="reason" className="form-control" value={formData.reason} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-12">
                                                <label className="form-label">Notes</label>
                                                <textarea name="notes" className="form-control" rows={3} value={formData.notes} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                        </div>

                                        <div className="text-center mt-5 d-flex gap-3 justify-content-center">
                                            <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                                {isLoading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Updating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave className="me-2" />
                                                        Update Appointment
                                                    </>
                                                )}
                                            </button>
                                            <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/appointments')} disabled={isLoading}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
