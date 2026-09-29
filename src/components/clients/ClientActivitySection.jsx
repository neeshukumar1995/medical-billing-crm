'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { FiClock } from 'react-icons/fi'
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
        <div className="card mb-4">
            <div className="card-header">
                <h5 className="card-title mb-0"><FiClock className="me-2" />Activity</h5>
            </div>
            <div className="card-body p-0">
                {logs.length === 0 && !loading ? (
                    <div className="text-muted text-center py-4 fs-13">No activity recorded yet.</div>
                ) : (
                    <ul className="list-group list-group-flush">
                        {logs.map(log => {
                            const change = describeChange(log.old_values, log.new_values)
                            return (
                                <li key={log.id} className="list-group-item">
                                    <div className="d-flex align-items-start gap-2">
                                        <span className={`badge ${ACTION_BADGE[log.action] || 'bg-soft-secondary text-secondary'}`}>
                                            {log.action.replace(/_/g, ' ')}
                                        </span>
                                        <div className="flex-grow-1">
                                            <div className="fs-13">{log.description}</div>
                                            {change && <div className="fs-12 text-muted">{change}</div>}
                                        </div>
                                        <div className="text-end fs-12 text-muted text-nowrap">
                                            <div>{log.user_name || 'System'}</div>
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
                    <div className="text-center p-2">
                        <button className="btn btn-sm btn-light-brand" disabled={loading} onClick={() => load(meta.current_page + 1, true)}>
                            {loading ? 'Loading...' : 'Load more'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ClientActivitySection
