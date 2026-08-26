'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus, FiRepeat } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import AppointmentModal from '@/components/medicalBilling/AppointmentModal'

const STATUS_COLORS = {
    scheduled: 'primary',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger',
    no_show: 'secondary',
}

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [appointments, setAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [appointmentModal, setAppointmentModal] = useState(null) // { id, mode } | null

    const fetchAppointments = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter

            const response = await crmInstance.get('/medical-billing/appointments', { params })
            const data = response.data?.data
            setAppointments(Array.isArray(data) ? data : [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load appointments. Please try again.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view appointments.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setAppointments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAppointments() }, [statusFilter])

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Cancel Appointment',
            text: 'Are you sure you want to cancel this appointment?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it',
            cancelButtonText: 'No',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/appointments/${id}`)
            setAppointments(prev => prev.filter(a => a.id !== id))
            Swal.fire({ title: 'Cancelled!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to cancel appointment.', icon: 'error' })
        }
    }

    const handleConvert = async (appointment) => {
        const result = await Swal.fire({
            title: 'Create Encounter',
            text: `Create an encounter from this appointment?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Create',
            confirmButtonColor: '#007bff'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.post(`/medical-billing/appointments/${appointment.id}/convert-to-encounter`)
            Swal.fire({ title: 'Encounter Created!', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchAppointments()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to create encounter.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_appointments.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_appointments.manage') && (
                        <Link href="/medical-billing/appointments/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Appointment
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='d-flex justify-content-end'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="no_show">No Show</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Date / Time</th>
                                                <th>Patient</th>
                                                <th>Provider</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" className="text-center py-4"><Spinner label="Loading appointments..." variant="spinner" /></td></tr>
                                            ) : appointments.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center py-4">No appointments found.</td></tr>
                                            ) : (
                                                appointments.map((a) => (
                                                    <tr key={a.id}>
                                                        <td>{a.appointment_date} {a.appointment_time}</td>
                                                        <td>{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'N/A'}</td>
                                                        <td>{a.provider ? `${a.provider.first_name} ${a.provider.last_name}` : 'N/A'}</td>
                                                        <td className="text-capitalize">{a.appointment_type || 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[a.status] || 'secondary'} text-${STATUS_COLORS[a.status] || 'secondary'} text-capitalize`}>
                                                                {a.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_appointments.manage') && a.status !== 'cancelled' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Create Encounter" onClick={() => handleConvert(a)}>
                                                                        <FiRepeat />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_appointments.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setAppointmentModal({ id: a.id, mode: 'edit' })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_appointments.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Cancel" onClick={() => handleDelete(a.id)}>
                                                                        <FiTrash2 />
                                                                    </button>
                                                                )}
                                                            </div>
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

            {appointmentModal && (
                <AppointmentModal
                    appointmentId={appointmentModal.id}
                    initialMode={appointmentModal.mode}
                    onClose={() => setAppointmentModal(null)}
                    onSaved={fetchAppointments}
                />
            )}
        </PermissionGuard>
    )
}

export default page
