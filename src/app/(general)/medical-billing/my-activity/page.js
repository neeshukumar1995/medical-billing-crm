'use client'
import React, { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { FiActivity } from 'react-icons/fi'
import { formatDateTime } from '@/utils/formatDate'

const ACTION_COLORS = { create: 'success', update: 'info', delete: 'danger', submit: 'primary', bulk_assign: 'warning' }

// Modules the audit log records, with readable names.
const MODULES = {
    medical_patients: 'Patients',
    medical_patient_notes: 'Patient Notes',
    medical_appointments: 'Appointments',
    medical_encounters: 'Encounters',
    medical_charges: 'Charges',
    medical_claims: 'Claims',
    medical_payments: 'Payments',
    medical_denials: 'Denials',
    medical_ar_accounts: 'AR',
    medical_credentialing: 'Credentialing',
    medical_credentialing_notes: 'Credentialing Notes',
    medical_providers: 'Providers',
}
const moduleLabel = (m = '') => MODULES[m] || m.replace('medical_', '').replace(/_/g, ' ')
const PER_PAGE = 20

/** The signed-in employee's own work history (moved here from My Task). */
const page = () => {
    const { user } = useUser()
    const [logs, setLogs] = useState([])
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ module: '', from: '', to: '' })

    const load = useCallback(async (pageNo = 1) => {
        if (!user?.id) return
        setLoading(true)
        try {
            const params = { user_id: user.id, per_page: PER_PAGE, page: pageNo }
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
            const { data } = await crmInstance.get('/medical-billing/audit-logs', { params })
            setLogs(data?.data || [])
            setMeta({ current_page: data?.current_page || 1, last_page: data?.last_page || 1, total: data?.total || 0 })
        } catch {
            setLogs([])
        } finally {
            setLoading(false)
        }
    }, [user?.id, filters])

    useEffect(() => { load(1) }, [load])

    const setFilter = (key) => (e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader />
            <div className="main-content">
                <div className="card">
                    <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div>
                            <h5 className="card-title mb-0 d-flex align-items-center gap-2"><FiActivity className="text-primary" /> My Activity</h5>
                            <span className="fs-12 text-muted">Everything you have done in this company — patients, appointments, claims, notes…</span>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            <select className="form-select form-select-sm" style={{ width: 170 }} value={filters.module} onChange={setFilter('module')}>
                                <option value="">All modules</option>
                                {Object.entries(MODULES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                            <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={filters.from} max={filters.to || undefined} onChange={setFilter('from')} title="From" />
                            <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={filters.to} min={filters.from || undefined} onChange={setFilter('to')} title="To" />
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {loading ? (
                            <div className="d-flex justify-content-center py-5"><Spinner label="Loading..." variant="spinner" /></div>
                        ) : logs.length === 0 ? (
                            <div className="text-center text-muted fs-13 py-5">
                                Nothing recorded yet — actions you take on patients, appointments and claims show up here.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Action</th>
                                            <th>Module</th>
                                            <th>Record</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id}>
                                                <td className="text-nowrap">{formatDateTime(String(log.created_at).replace(' ', 'T'))}</td>
                                                <td>
                                                    <span className={`badge bg-soft-${ACTION_COLORS[log.action] || 'secondary'} text-${ACTION_COLORS[log.action] || 'secondary'} text-capitalize`}>
                                                        {String(log.action).replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="text-capitalize">{moduleLabel(log.module)}</td>
                                                <td className="text-muted">{log.record_id ? `#${log.record_id}` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {meta.last_page > 1 && (
                        <div className="card-footer d-flex justify-content-between align-items-center">
                            <span className="fs-12 text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} entries</span>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-secondary" disabled={loading || meta.current_page <= 1} onClick={() => load(meta.current_page - 1)}>Previous</button>
                                <button className="btn btn-sm btn-outline-secondary" disabled={loading || meta.current_page >= meta.last_page} onClick={() => load(meta.current_page + 1)}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
