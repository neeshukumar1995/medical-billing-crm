'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { FiClock, FiUser } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { formatDateTime } from '@/utils/formatDate'

const ACTION_BADGE = {
    created: 'bg-soft-success text-success',
    updated: 'bg-soft-primary text-primary',
    moved: 'bg-soft-warning text-warning',
    deleted: 'bg-soft-danger text-danger',
    imported: 'bg-soft-info text-info',
    client_admin_created: 'bg-soft-info text-info',
}

// {"status":"Active"} -> "status: Active"
const describeChange = (oldValues, newValues) => {
    const parse = (v) => {
        if (!v) return {}
        try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return {} }
    }
    const before = parse(oldValues)
    const after = parse(newValues)
    return Object.keys(after)
        .filter(key => key in before)
        .map(key => `${key.replace(/_/g, ' ')}: ${before[key] ?? '—'} → ${after[key] ?? '—'}`)
        .join(', ')
}

/** Audit trail of this client and its companies (GET /clients/{id}/activity). */
const ClientActivitySection = ({ clientId, refreshKey }) => {
    const [logs, setLogs] = useState([])
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1 })
    const [loading, setLoading] = useState(true)

    const load = useCallback(async (page, append) => {
        setLoading(true)
        try {
            const { data } = await crmInstance.get(`/clients/${clientId}/activity`, { params: { page, per_page: 10 } })
            setLogs(prev => append ? [...prev, ...(data.data || [])] : (data.data || []))
            setMeta({ current_page: data.current_page, last_page: data.last_page })
        } catch {
            if (!append) setLogs([])
        } finally {
            setLoading(false)
        }
    }, [clientId])

    useEffect(() => { load(1, false) }, [load, refreshKey])

    return (
        <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center gap-2">
                <div className="avatar-text avatar-sm bg-soft-info text-info rounded-3 shadow-none">
                    <FiClock size={15} />
                </div>
                <div>
                    <h5 className="card-title mb-0 fw-bold text-dark">Activity History</h5>
                    <span className="fs-12 text-muted">Audit trail of updates across this client and its linked companies</span>
                </div>
            </div>
            <div className="card-body p-0">
                {logs.length === 0 && !loading ? (
                    <div className="text-muted text-center py-5 fs-13">No activity recorded yet.</div>
                ) : (
                    <ul className="list-group list-group-flush">
                        {logs.map(log => {
                            const change = describeChange(log.old_values, log.new_values)
                            return (
                                <li key={log.id} className="list-group-item px-4 py-3">
                                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                                        <div className="d-flex align-items-start gap-2.5 flex-grow-1">
                                            <span className={`badge rounded-pill px-2.5 py-1 text-capitalize mt-0.5 ${ACTION_BADGE[log.action] || 'bg-soft-secondary text-secondary'}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                            <div>
                                                <div className="fs-13 fw-semibold text-dark">{log.description}</div>
                                                {change && <div className="fs-12 text-muted mt-0.5">{change}</div>}
                                            </div>
                                        </div>
                                        <div className="text-end fs-12 text-muted text-nowrap">
                                            <div className="fw-semibold text-dark d-inline-flex align-items-center gap-1">
                                                <FiUser size={11} className="text-muted" />
                                                {log.user_name || 'System'}
                                            </div>
                                            {/* DB timestamp "Y-m-d H:i:s" — the T makes it ISO so every browser parses it */}
                                            <div>{log.created_at ? formatDateTime(String(log.created_at).replace(' ', 'T')) : ''}</div>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
                {meta.current_page < meta.last_page && (
                    <div className="text-center p-3 border-top bg-light-subtle">
                        <button className="btn btn-sm btn-outline-primary rounded-pill px-4" disabled={loading} onClick={() => load(meta.current_page + 1, true)}>
                            {loading ? 'Loading...' : 'Load more activity'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ClientActivitySection
