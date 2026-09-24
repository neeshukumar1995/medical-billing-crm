'use client'
import React, { useState, useEffect } from 'react'
import { FiUser } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'

/**
 * Assign (or unassign) many already-uploaded/existing patients to one
 * employee in a single action — the follow-up to leaving "Unassigned" at
 * upload time.
 */
const BulkAssignModal = ({ patientIds, onClose, onAssigned }) => {
    const [users, setUsers] = useState([])
    const [assignedTo, setAssignedTo] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const cid = localStorage.getItem('companyId')
        const parsedCid = cid ? JSON.parse(cid) : null
        if (!parsedCid) return
        crmInstance.get(`/users/${parsedCid}`, { params: { all: 1 } })
            .then(({ data }) => setUsers(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => {})
    }, [])

    const handleAssign = async () => {
        setSaving(true)
        setError('')
        try {
            const { data } = await crmInstance.post('/medical-billing/patients/bulk-assign', {
                patient_ids: patientIds,
                assigned_to: assignedTo || null,
            })
            if (onAssigned) onAssigned(data)
            onClose()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign patients.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Assign {patientIds.length} Patient{patientIds.length !== 1 ? 's' : ''}</h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            {error && <div className="alert alert-danger py-2">{error}</div>}
                            <label className="form-label d-flex align-items-center gap-1"><FiUser size={14} /> Assign to</label>
                            <select
                                className="form-select"
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                disabled={saving}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-light-brand" onClick={onClose} disabled={saving}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}

export default BulkAssignModal
