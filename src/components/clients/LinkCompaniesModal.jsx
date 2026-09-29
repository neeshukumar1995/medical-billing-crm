'use client'
import React, { useEffect, useState } from 'react'
import crmInstance from '@/utils/crmInstance'

/**
 * Pick existing companies (e.g. ones created before clients existed) and
 * link them to this client. Platform users only — it moves companies
 * between clients.
 */
const LinkCompaniesModal = ({ client, onClose, onLinked }) => {
    const [companies, setCompanies] = useState([])
    const [selected, setSelected] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        crmInstance.get('/companies')
            .then(({ data }) => {
                const list = Array.isArray(data) ? data : (data?.data || [])
                // Unlinked companies first, then those of other clients.
                setCompanies(list
                    .filter(c => c.client_id !== client.id)
                    .sort((a, b) => (a.client_id ? 1 : 0) - (b.client_id ? 1 : 0) || a.name.localeCompare(b.name)))
            })
            .catch(() => setError('Failed to load companies'))
            .finally(() => setLoading(false))
    }, [client.id])

    const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

    const handleLink = async () => {
        setSaving(true)
        setError('')
        try {
            await crmInstance.post(`/clients/${client.id}/companies`, { company_ids: selected })
            onLinked()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to link companies')
            setSaving(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Link companies to {client.name}</h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            {error && <div className="alert alert-danger py-2">{error}</div>}
                            {loading ? (
                                <div className="text-muted">Loading companies...</div>
                            ) : companies.length === 0 ? (
                                <div className="text-muted">Every company already belongs to this client.</div>
                            ) : (
                                <ul className="list-group">
                                    {companies.map(c => (
                                        <li key={c.id} className="list-group-item d-flex align-items-center gap-2">
                                            <input
                                                id={`link-co-${c.id}`}
                                                type="checkbox"
                                                className="form-check-input m-0"
                                                checked={selected.includes(c.id)}
                                                onChange={() => toggle(c.id)}
                                                disabled={saving}
                                            />
                                            <label htmlFor={`link-co-${c.id}`} className="flex-grow-1 mb-0" style={{ cursor: 'pointer' }}>
                                                {c.name}
                                            </label>
                                            {c.client ? (
                                                <span className="badge bg-soft-warning text-warning" title="Linking moves it out of this client">
                                                    now in {c.client.name}
                                                </span>
                                            ) : (
                                                <span className="badge bg-soft-secondary text-secondary">no client</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-light-brand" onClick={onClose} disabled={saving}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleLink} disabled={saving || selected.length === 0}>
                                {saving ? 'Linking...' : `Link ${selected.length || ''} compan${selected.length === 1 ? 'y' : 'ies'}`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}

export default LinkCompaniesModal
