'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { FiUsers, FiCalendar, FiDollarSign, FiClock, FiChevronRight, FiFileText, FiArrowRight } from 'react-icons/fi'
import PatientModal from '@/components/medicalBilling/PatientModal'
import AppointmentModal from '@/components/medicalBilling/AppointmentModal'
import ArModal from '@/components/medicalBilling/ArModal'
import { formatDate } from '@/utils/formatDate'

const APPT_STATUS_COLORS = { scheduled: 'primary', confirmed: 'info', completed: 'success', cancelled: 'danger', no_show: 'secondary' }
const AR_STATUS_COLORS = { open: 'danger', follow_up: 'warning', patient_balance: 'info', resolved: 'success', written_off: 'secondary' }
const BUCKET_COLORS = { '0-30': 'success', '31-60': 'warning', '61-90': 'danger', '90+': 'dark' }

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const money = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const humanize = (s = '') => s.replace(/_/g, ' ')
const fullName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ')

// "13:15:00" -> "1:15 PM"
const formatClock = (time) => {
    if (!time) return ''
    const [h, m] = String(time).split(':').map(Number)
    if (Number.isNaN(h)) return time
    return `${h % 12 || 12}:${pad(m || 0)} ${h >= 12 ? 'PM' : 'AM'}`
}

// appointment_date may be "2026-10-06" or "2026-10-06T04:00:00.000000Z" — use the calendar date part.
const dateOnly = (value) => (value ? String(value).slice(0, 10) : '')

const dayLabel = (value) => {
    const day = dateOnly(value)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    if (day === ymd(today)) return 'Today'
    if (day === ymd(tomorrow)) return 'Tomorrow'
    return formatDate(day)
}

const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

const StatTile = ({ icon: Icon, label, value, color, loading }) => (
    <div className="col-xl-3 col-md-6">
        <div className="card mb-0 h-100 mt-task-stat">
            <div className="card-body d-flex align-items-center gap-3">
                <div className={`avatar-text avatar-lg rounded bg-soft-${color} text-${color}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <div className="fs-12 text-muted">{label}</div>
                    <div className="fs-20 fw-bold text-dark">{loading ? '—' : value}</div>
                </div>
            </div>
        </div>
    </div>
)

const Panel = ({ icon: Icon, title, subtitle, viewAllHref, loading, error, emptyText, isEmpty, children }) => (
    <div className="card mb-0 h-100">
        <div className="card-header d-flex align-items-center justify-content-between">
            <div>
                <h6 className="mb-0 d-flex align-items-center gap-2"><Icon className="text-primary" /> {title}</h6>
                {subtitle && <span className="fs-11 text-muted">{subtitle}</span>}
            </div>
            {viewAllHref && (
                <Link href={viewAllHref} className="fs-12 fw-semibold d-inline-flex align-items-center gap-1">
                    View all <FiArrowRight size={12} />
                </Link>
            )}
        </div>
        <div className="card-body p-0 mt-task-panel">
            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner label="Loading..." variant="spinner" /></div>
            ) : error ? (
                <div className="alert alert-warning m-3 py-2 px-3 small">{error}</div>
            ) : isEmpty ? (
                <div className="text-center text-muted fs-13 py-5 px-3">{emptyText}</div>
            ) : children}
        </div>
    </div>
)

/** One clickable row: main text on the left, meta under it, extra on the right. */
const TaskRow = ({ onClick, title, meta, badges, right }) => (
    <div
        role="button"
        tabIndex={0}
        className="mt-task-row d-flex align-items-center gap-3 px-3 py-2"
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
    >
        <div className="flex-grow-1 min-w-0 text-start">
            <div className="fw-semibold text-dark text-truncate">{title}</div>
            {meta && <div className="fs-12 text-muted text-truncate">{meta}</div>}
            {badges && <div className="d-flex flex-wrap gap-1 mt-1">{badges}</div>}
        </div>
        {right && <div className="text-end text-nowrap">{right}</div>}
        <FiChevronRight className="text-muted flex-shrink-0" />
    </div>
)

const Badge = ({ color, children }) => (
    <span className={`badge bg-soft-${color || 'secondary'} text-${color || 'secondary'} text-capitalize fw-medium`}>{children}</span>
)

const useList = (url, params, enabled) => {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const key = JSON.stringify(params)

    const load = useCallback(async () => {
        try {
            const { data } = await crmInstance.get(url, { params: JSON.parse(key) })
            setRows(Array.isArray(data?.data) ? data.data : [])
            setError('')
        } catch (err) {
            setRows([])
            setError(err.response?.data?.message || 'Could not load this list right now.')
        } finally {
            setLoading(false)
        }
    }, [url, key])

    useEffect(() => { if (enabled) load() }, [enabled, load])
    return { rows, loading, error, reload: load }
}

const page = () => {
    const { user, activeCompany, loading: userLoading } = useUser()
    const userId = user?.id

    const patients = useList('/medical-billing/patients', { assigned_to: userId }, !!userId)
    const appointments = useList('/medical-billing/appointments', { assigned_to: userId, date_from: ymd(new Date()) }, !!userId)
    const ar = useList('/medical-billing/ar', { assigned_to: userId }, !!userId)

    const [patientModal, setPatientModal] = useState(null) // { id, mode } | null
    const [appointmentModal, setAppointmentModal] = useState(null)
    const [openArId, setOpenArId] = useState(null)

    const upcoming = [...appointments.rows].sort((a, b) =>
        `${dateOnly(a.appointment_date)} ${a.appointment_time || ''}`.localeCompare(`${dateOnly(b.appointment_date)} ${b.appointment_time || ''}`))
    const arRows = [...ar.rows].sort((a, b) => Number(b.total_balance || 0) - Number(a.total_balance || 0))
    const outstanding = ar.rows.reduce((sum, row) => sum + Number(row.total_balance || 0), 0)
    const todayCount = upcoming.filter(a => dateOnly(a.appointment_date) === ymd(new Date())).length

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader />
            <div className="main-content">
                {userLoading ? (
                    <div className="d-flex justify-content-center py-5">
                        <Spinner label="Loading your workspace..." variant="spinner" />
                    </div>
                ) : (
                    <>
                        {/* Greeting */}
                        <div className="mb-4">
                            <h4 className="mb-1">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h4>
                            <div className="fs-13 text-muted">
                                {formatDate(new Date())}
                                {activeCompany?.name && <> · {activeCompany.client?.name ? `${activeCompany.client.name} / ` : ''}{activeCompany.name}</>}
                                {' · '}here is the work assigned to you.
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="row g-3 mb-4">
                            <StatTile icon={FiUsers} label="Assigned Patients" value={patients.rows.length} color="primary" loading={patients.loading} />
                            <StatTile icon={FiCalendar} label={`Upcoming Appointments${todayCount ? ` · ${todayCount} today` : ''}`} value={upcoming.length} color="info" loading={appointments.loading} />
                            <StatTile icon={FiFileText} label="Claims to Follow Up" value={arRows.length} color="warning" loading={ar.loading} />
                            <StatTile icon={FiDollarSign} label="Outstanding Balance" value={money(outstanding)} color="danger" loading={ar.loading} />
                        </div>

                        <div className="row g-3">
                            {/* My Patients */}
                            <div className="col-xl-4">
                                <Panel
                                    icon={FiUsers}
                                    title="My Patients"
                                    subtitle="Patients you are responsible for"
                                    viewAllHref="/medical-billing/patients"
                                    loading={patients.loading}
                                    error={patients.error}
                                    isEmpty={patients.rows.length === 0}
                                    emptyText="No patients are assigned to you yet."
                                >
                                    {patients.rows.map(p => (
                                        <TaskRow
                                            key={p.id}
                                            onClick={() => setPatientModal({ id: p.id, mode: 'view' })}
                                            title={fullName(p)}
                                            meta={[p.patient_number, p.phone].filter(Boolean).join(' · ')}
                                            right={<Badge color={p.status === 'active' ? 'success' : 'secondary'}>{p.status}</Badge>}
                                        />
                                    ))}
                                </Panel>
                            </div>

                            {/* My Appointments */}
                            <div className="col-xl-4">
                                <Panel
                                    icon={FiCalendar}
                                    title="Upcoming Appointments"
                                    subtitle="From today, soonest first"
                                    viewAllHref="/medical-billing/appointments"
                                    loading={appointments.loading}
                                    error={appointments.error}
                                    isEmpty={upcoming.length === 0}
                                    emptyText="No upcoming appointments assigned to you."
                                >
                                    {upcoming.map(a => (
                                        <TaskRow
                                            key={a.id}
                                            onClick={() => setAppointmentModal({ id: a.id, mode: 'view' })}
                                            title={a.patient ? fullName(a.patient) : 'Patient'}
                                            meta={<><FiClock className="me-1" />{dayLabel(a.appointment_date)}{a.appointment_time ? `, ${formatClock(a.appointment_time)}` : ''}{a.appointment_type ? ` · ${a.appointment_type}` : ''}</>}
                                            right={<Badge color={APPT_STATUS_COLORS[a.status]}>{humanize(a.status)}</Badge>}
                                        />
                                    ))}
                                </Panel>
                            </div>

                            {/* My AR / Claims */}
                            <div className="col-xl-4">
                                <Panel
                                    icon={FiDollarSign}
                                    title="Claims to Follow Up"
                                    subtitle="Unpaid balances, largest first"
                                    viewAllHref="/medical-billing/ar"
                                    loading={ar.loading}
                                    error={ar.error}
                                    isEmpty={arRows.length === 0}
                                    emptyText="No claims are waiting on you for follow-up."
                                >
                                    {arRows.map(row => (
                                        <TaskRow
                                            key={row.id}
                                            onClick={() => setOpenArId(row.id)}
                                            title={row.claim?.claim_number || 'Claim'}
                                            meta={[row.patient ? fullName(row.patient) : '', row.payer?.name].filter(Boolean).join(' · ')}
                                            badges={<>
                                                <Badge color={BUCKET_COLORS[row.aging_bucket]}>{row.aging_bucket} days</Badge>
                                                <Badge color={AR_STATUS_COLORS[row.status]}>{humanize(row.status)}</Badge>
                                            </>}
                                            right={<span className="fw-semibold text-dark">{money(row.total_balance)}</span>}
                                        />
                                    ))}
                                </Panel>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {patientModal && (
                <PatientModal
                    patientId={patientModal.id}
                    initialMode={patientModal.mode}
                    onClose={() => setPatientModal(null)}
                    onSaved={patients.reload}
                />
            )}
            {appointmentModal && (
                <AppointmentModal
                    appointmentId={appointmentModal.id}
                    initialMode={appointmentModal.mode}
                    onClose={() => setAppointmentModal(null)}
                    onSaved={appointments.reload}
                />
            )}
            {openArId && (
                <ArModal
                    arId={openArId}
                    onClose={() => setOpenArId(null)}
                    onSaved={ar.reload}
                />
            )}

            <style jsx global>{`
                .mt-task-panel { max-height: 460px; overflow-y: auto; }
                .mt-task-row { cursor: pointer; border-bottom: 1px solid var(--bs-border-color, #eef0f4); transition: background-color .15s; }
                .mt-task-row:last-child { border-bottom: 0; }
                .mt-task-row:hover, .mt-task-row:focus { background-color: rgba(52, 84, 209, 0.05); outline: none; }
            `}</style>
        </PermissionGuard>
    )
}

export default page
