'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import crmInstance from '@/utils/crmInstance'
import { formatDateTime } from '@/utils/formatDate'

const ACTION_COLORS = { create: 'success', update: 'info', delete: 'danger', submit: 'primary' }

const humanize = (s = '') => s.replace('medical_', '').replace(/_/g, ' ')

const fmtWhen = (d) => formatDateTime(d) || d

const page = () => {
    const router = useRouter()
    const [logs, setLogs] = useState([])
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [users, setUsers] = useState([])
    const [userId, setUserId] = useState('')

    // Who can be picked in the filter — this company's employees
    useEffect(() => {
        const cid = localStorage.getItem('companyId')
        const parsedCid = cid ? JSON.parse(cid) : null
        if (!parsedCid) return
        crmInstance.get(`/users/${parsedCid}`, { params: { all: 1 } })
            .then(({ data }) => setUsers(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => {})
    }, [])

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true)
            const { data } = await crmInstance.get('/medical-billing/audit-logs', {
                params: { page, per_page: 20, user_id: userId || undefined },
            })
            setLogs(data?.data || [])
            setLastPage(data?.last_page || 1)
            setTotal(data?.total ?? (data?.data?.length || 0))
            setError('')
        } catch (err) {
            setLogs([])
            setError(err.response?.data?.message || 'Could not load activity right now.')
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [page, userId])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader>
                <button onClick={() => router.back()} className="btn btn-outline-primary">
                    <i className="me-2">⬅️</i>Back
                </button>
            </PageHeader>
            <div className="main-content">
                <div className="card">
                    <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                            <h5 className="card-title mb-0">Employee Activity</h5>
                            <span className="fs-12 text-muted">Every create/update/submit any employee has made in Medical Billing</span>
                        </div>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 220 }}
                            value={userId}
                            onChange={(e) => { setUserId(e.target.value); setPage(1) }}
                        >
                            <option value="">All employees</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="card-body">
                        {error && <div className="alert alert-warning">{error}</div>}
                        <div className="text-muted small mb-2">
                            {loading ? 'Loading…' : `Total: ${total} activit${total === 1 ? 'y' : 'ies'}`}
                        </div>
                        {loading ? (
                            <div className="d-flex justify-content-center py-5"><Spinner label="Loading activity..." variant="spinner" /></div>
                        ) : logs.length === 0 ? (
                            <p className="text-muted text-center py-4 mb-0">No activity recorded yet.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Employee</th>
                                            <th>Module</th>
                                            <th>Action</th>
                                            <th>Record #</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id}>
                                                <td className="text-muted small">{fmtWhen(log.created_at)}</td>
                                                <td>{log.user_name || '—'}</td>
                                                <td className="text-capitalize">{humanize(log.module)}</td>
                                                <td>
                                                    <span className={`badge bg-soft-${ACTION_COLORS[log.action] || 'secondary'} text-${ACTION_COLORS[log.action] || 'secondary'} text-capitalize`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="text-muted">{log.record_id || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {lastPage > 1 && (
                            <div className="d-flex justify-content-end gap-2 mt-3">
                                <button className="btn btn-sm btn-outline-primary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                                <span className="align-self-center small text-muted">Page {page} of {lastPage}</span>
                                <button className="btn btn-sm btn-outline-primary" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Next</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
