'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { FiUsers, FiCalendar, FiDollarSign, FiClock, FiChevronRight, FiActivity } from 'react-icons/fi'
import PatientModal from '@/components/medicalBilling/PatientModal'
import AppointmentModal from '@/components/medicalBilling/AppointmentModal'
import ArModal from '@/components/medicalBilling/ArModal'
import { formatDateTime } from '@/utils/formatDate'

const ACTIVITY_ACTION_COLORS = { create: 'success', update: 'info', delete: 'danger', submit: 'primary' }
const humanizeModule = (s = '') => s.replace('medical_', '').replace(/_/g, ' ')

const PATIENT_STATUS_COLORS = { active: 'success' }
const APPT_STATUS_COLORS = {
    scheduled: 'primary',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger',
    no_show: 'secondary',
}
const AR_STATUS_COLORS = { open: 'danger', follow_up: 'warning', patient_balance: 'info', resolved: 'success', written_off: 'secondary' }
const BUCKET_COLORS = { '0-30': 'success', '31-60': 'warning', '61-90': 'danger', '90+': 'dark' }

const todayStr = () => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
}

const SectionCard = ({ icon, title, count, children }) => (
    <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0 d-flex align-items-center gap-2">{icon}{title}</h6>
                {typeof count === 'number' && <span className="badge bg-soft-primary text-primary">{count}</span>}
            </div>
            {children}
        </div>
    </div>
)

const EmptyState = ({ text }) => (
    <p className="text-muted small mb-0 py-3 text-center">{text}</p>
)

const page = () => {
    const router = useRouter()
    const { user, loading: userLoading } = useUser()
    const userId = user?.id

    // My Patients
    const [patients, setPatients] = useState([])
    const [patientsLoading, setPatientsLoading] = useState(true)
    const [patientsError, setPatientsError] = useState('')

    // My Appointments
    const [appointments, setAppointments] = useState([])
    const [appointmentsLoading, setAppointmentsLoading] = useState(true)
    const [appointmentsError, setAppointmentsError] = useState('')

    // My AR / Claims
    const [arAccounts, setArAccounts] = useState([])
    const [arLoading, setArLoading] = useState(true)
    const [arError, setArError] = useState('')

    // My Recent Activity — proof to both the employee and the company that
    // work here is being tracked (backed by the existing audit log).
    const [activity, setActivity] = useState([])
    const [activityLoading, setActivityLoading] = useState(true)

    // Which record's modal is currently open (view/edit happens in-place now,
    // no more navigating away from this dashboard).
    const [patientModal, setPatientModal] = useState(null) // { id, mode } | null
    const [appointmentModal, setAppointmentModal] = useState(null) // { id, mode } | null
    const [openArId, setOpenArId] = useState(null)

    // Plain refetch helpers (no mount-race cancellation needed — these only
    // ever run in response to a user action, after the modal already closed).
    const refetchPatients = async () => {
        if (!userId) return
        try {
            const response = await crmInstance.get('/medical-billing/patients', { params: { assigned_to: userId } })
            const data = response.data?.data
            setPatients(Array.isArray(data) ? data : [])
        } catch {
            // non-fatal — list just stays as-is
        }
    }

    const refetchAppointments = async () => {
        if (!userId) return
        try {
            const response = await crmInstance.get('/medical-billing/appointments', {
                params: { assigned_to: userId, date_from: todayStr() },
            })
            const data = response.data?.data
            setAppointments(Array.isArray(data) ? data : [])
        } catch {
            // non-fatal — list just stays as-is
        }
    }

    const refetchAr = async () => {
        if (!userId) return
        try {
            const response = await crmInstance.get('/medical-billing/ar', { params: { assigned_to: userId } })
            const data = response.data?.data
            setArAccounts(Array.isArray(data) ? data : [])
        } catch {
            // non-fatal — list just stays as-is
        }
    }

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const fetchPatients = async () => {
            try {
                setPatientsLoading(true)
                const response = await crmInstance.get('/medical-billing/patients', { params: { assigned_to: userId } })
                if (cancelled) return
                const data = response.data?.data
                setPatients(Array.isArray(data) ? data : [])
                setPatientsError('')
            } catch (err) {
                if (cancelled) return
                setPatients([])
                setPatientsError(err.response?.data?.message || 'Could not load your patients right now.')
            } finally {
                if (!cancelled) setPatientsLoading(false)
            }
        }
        fetchPatients()
        return () => { cancelled = true }
    }, [userId])

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const fetchAppointments = async () => {
            try {
                setAppointmentsLoading(true)
                const response = await crmInstance.get('/medical-billing/appointments', {
                    params: { assigned_to: userId, date_from: todayStr() },
                })
                if (cancelled) return
                const data = response.data?.data
                setAppointments(Array.isArray(data) ? data : [])
                setAppointmentsError('')
            } catch (err) {
                if (cancelled) return
                setAppointments([])
                setAppointmentsError(err.response?.data?.message || 'Could not load your appointments right now.')
            } finally {
                if (!cancelled) setAppointmentsLoading(false)
            }
        }
        fetchAppointments()
        return () => { cancelled = true }
    }, [userId])

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        const fetchAr = async () => {
            try {
                setArLoading(true)
                const response = await crmInstance.get('/medical-billing/ar', { params: { assigned_to: userId } })
                if (cancelled) return
                const data = response.data?.data
                setArAccounts(Array.isArray(data) ? data : [])
                setArError('')
            } catch (err) {
                if (cancelled) return
                setArAccounts([])
                setArError(err.response?.data?.message || 'Could not load your AR accounts right now.')
            } finally {
                if (!cancelled) setArLoading(false)
            }
        }
        fetchAr()
        return () => { cancelled = true }
    }, [userId])

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        crmInstance.get('/medical-billing/audit-logs', { params: { user_id: userId, per_page: 6 } })
            .then(({ data }) => { if (!cancelled) setActivity(data?.data || []) })
            .catch(() => { if (!cancelled) setActivity([]) })
            .finally(() => { if (!cancelled) setActivityLoading(false) })
        return () => { cancelled = true }
    }, [userId])

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                </div>
            </PageHeader>
            <div className="main-content">
                {userLoading ? (
                    <div className="d-flex justify-content-center py-5">
                        <Spinner label="Loading your workspace..." variant="spinner" />
                    </div>
                ) : (
                    <div className="row g-3">
                        {/* My Patients */}
                        <div className="col-lg-4">
                            <SectionCard icon={<FiUsers />} title="My Patients" count={!patientsLoading ? patients.length : undefined}>
                                {patientsLoading ? (
                                    <div className="d-flex justify-content-center py-4"><Spinner label="Loading..." variant="spinner" /></div>
                                ) : patientsError ? (
                                    <div className="alert alert-warning py-2 px-3 small mb-0">{patientsError}</div>
                                ) : patients.length === 0 ? (
                                    <EmptyState text="No patients assigned to you yet." />
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {patients.map(p => (
                                            <li key={p.id} className="mb-2 pb-2 border-bottom">
                                                <button
                                                    type="button"
                                                    className="btn btn-link p-0 w-100 d-flex align-items-center justify-content-between text-decoration-none text-dark"
                                                    onClick={() => setPatientModal({ id: p.id, mode: 'view' })}
                                                >
                                                    <span>
                                                        <span className="fw-semibold">{[p.first_name, p.last_name].filter(Boolean).join(' ')}</span>
                                                        <span className="text-muted small ms-2">{p.patient_number}</span>
                                                        <div>
                                                            <span className={`badge bg-soft-${PATIENT_STATUS_COLORS[p.status] || 'secondary'} text-${PATIENT_STATUS_COLORS[p.status] || 'secondary'} text-capitalize`}>
                                                                {p.status}
                                                            </span>
                                                        </div>
                                                    </span>
                                                    <FiChevronRight className="text-muted" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>
                        </div>

                        {/* My Appointments */}
                        <div className="col-lg-4">
                            <SectionCard icon={<FiCalendar />} title="My Appointments" count={!appointmentsLoading ? appointments.length : undefined}>
                                {appointmentsLoading ? (
                                    <div className="d-flex justify-content-center py-4"><Spinner label="Loading..." variant="spinner" /></div>
                                ) : appointmentsError ? (
                                    <div className="alert alert-warning py-2 px-3 small mb-0">{appointmentsError}</div>
                                ) : appointments.length === 0 ? (
                                    <EmptyState text="No upcoming appointments assigned to you." />
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {appointments.map(a => (
                                            <li key={a.id} className="mb-2 pb-2 border-bottom">
                                                <button
                                                    type="button"
                                                    className="btn btn-link p-0 w-100 d-flex align-items-center justify-content-between text-decoration-none text-dark"
                                                    onClick={() => setAppointmentModal({ id: a.id, mode: 'view' })}
                                                >
                                                    <span>
                                                        <span className="fw-semibold">{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Patient'}</span>
                                                        <div className="text-muted small">
                                                            <FiClock className="me-1" />{a.appointment_date} {a.appointment_time}
                                                        </div>
                                                        <span className={`badge bg-soft-${APPT_STATUS_COLORS[a.status] || 'secondary'} text-${APPT_STATUS_COLORS[a.status] || 'secondary'} text-capitalize`}>
                                                            {a.status?.replace('_', ' ')}
                                                        </span>
                                                    </span>
                                                    <FiChevronRight className="text-muted" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>
                        </div>

                        {/* My AR / Claims */}
                        <div className="col-lg-4">
                            <SectionCard icon={<FiDollarSign />} title="My AR / Claims to Work On" count={!arLoading ? arAccounts.length : undefined}>
                                {arLoading ? (
                                    <div className="d-flex justify-content-center py-4"><Spinner label="Loading..." variant="spinner" /></div>
                                ) : arError ? (
                                    <div className="alert alert-warning py-2 px-3 small mb-0">{arError}</div>
                                ) : arAccounts.length === 0 ? (
                                    <EmptyState text="No AR accounts assigned to you for follow-up." />
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {arAccounts.map(ar => (
                                            <li key={ar.id} className="mb-2 pb-2 border-bottom">
                                                <button
                                                    type="button"
                                                    className="btn btn-link p-0 w-100 d-flex align-items-center justify-content-between text-decoration-none text-dark"
                                                    onClick={() => setOpenArId(ar.id)}
                                                >
                                                    <span>
                                                        <span className="fw-semibold">{ar.claim?.claim_number || 'Claim'}</span>
                                                        <div className="text-muted small">
                                                            {ar.patient ? `${ar.patient.first_name} ${ar.patient.last_name}` : ''}
                                                            {ar.payer?.name ? ` · ${ar.payer.name}` : ''}
                                                        </div>
                                                        <span className={`badge bg-soft-${BUCKET_COLORS[ar.aging_bucket] || 'secondary'} text-${BUCKET_COLORS[ar.aging_bucket] || 'secondary'} me-1`}>
                                                            {ar.aging_bucket}
                                                        </span>
                                                        <span className={`badge bg-soft-${AR_STATUS_COLORS[ar.status] || 'secondary'} text-${AR_STATUS_COLORS[ar.status] || 'secondary'} text-capitalize`}>
                                                            {ar.status?.replace('_', ' ')}
                                                        </span>
                                                        <div className="fw-semibold small mt-1">${Number(ar.total_balance || 0).toFixed(2)}</div>
                                                    </span>
                                                    <FiChevronRight className="text-muted" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>
                        </div>

                        {/* My Recent Activity — what the company sees tracked against this employee */}
                        <div className="col-lg-12">
                            <SectionCard icon={<FiActivity />} title="My Recent Activity" count={!activityLoading ? activity.length : undefined}>
                                {activityLoading ? (
                                    <div className="d-flex justify-content-center py-4"><Spinner label="Loading..." variant="spinner" /></div>
                                ) : activity.length === 0 ? (
                                    <EmptyState text="Nothing recorded yet — actions you take on patients, appointments and claims will show up here." />
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {activity.map(log => (
                                            <li key={log.id} className="d-flex align-items-center justify-content-between py-1 border-bottom">
                                                <span>
                                                    <span className={`badge bg-soft-${ACTIVITY_ACTION_COLORS[log.action] || 'secondary'} text-${ACTIVITY_ACTION_COLORS[log.action] || 'secondary'} text-capitalize me-2`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-capitalize">{humanizeModule(log.module)}</span>
                                                    {log.record_id && <span className="text-muted"> #{log.record_id}</span>}
                                                </span>
                                                <span className="text-muted small">{formatDateTime(log.created_at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>
                        </div>
                    </div>
                )}
            </div>

            {patientModal && (
                <PatientModal
                    patientId={patientModal.id}
                    initialMode={patientModal.mode}
                    onClose={() => setPatientModal(null)}
                    onSaved={refetchPatients}
                />
            )}
            {appointmentModal && (
                <AppointmentModal
                    appointmentId={appointmentModal.id}
                    initialMode={appointmentModal.mode}
                    onClose={() => setAppointmentModal(null)}
                    onSaved={refetchAppointments}
                />
            )}
            {openArId && (
                <ArModal
                    arId={openArId}
                    onClose={() => setOpenArId(null)}
                    onSaved={refetchAr}
                />
            )}
        </PermissionGuard>
    )
}

export default page
