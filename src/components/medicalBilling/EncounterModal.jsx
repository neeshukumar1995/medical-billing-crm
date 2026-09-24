'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiX, FiSave, FiClipboard } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { toInputDate } from '@/utils/formatDate'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const STATUS_COLORS = {
    open: 'primary',
    coding: 'warning',
    ready: 'info',
    closed: 'success',
}

const emptyForm = {
    provider_id: '',
    encounter_date: '',
    place_of_service_id: '',
    status: 'open',
    notes: '',
}

const toFormData = (e) => ({
    provider_id: e.provider_id || '',
    encounter_date: toInputDate(e.encounter_date),
    place_of_service_id: e.place_of_service_id || '',
    status: e.status || 'open',
    notes: e.notes || '',
})

export default function EncounterModal({ encounterId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [encounter, setEncounter] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [providers, setProviders] = useState([])
    const [placesOfService, setPlacesOfService] = useState([])
    const [isSaving, setIsSaving] = useState(false)

    const loadAll = async () => {
        try {
            setLoading(true)
            const [encRes, drRes, posRes] = await Promise.all([
                crmInstance.get(`/medical-billing/encounters/${encounterId}`),
                crmInstance.get('/medical-billing/providers', { params: { per_page: 500 } }),
                crmInstance.get('/medical-billing/place-of-services'),
            ])
            const e = encRes.data
            setEncounter(e)
            setFormData(toFormData(e))
            setProviders(drRes.data?.data || [])
            setPlacesOfService(posRes.data?.data || [])
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load encounter data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (encounterId) loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encounterId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (encounter) setFormData(toFormData(encounter))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (encounter) setFormData(toFormData(encounter))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/encounters/${encounterId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Encounter updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await loadAll()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update encounter'))
        } finally {
            setIsSaving(false)
        }
    }

    const providerRecord = encounter?.provider || providers.find(p => String(p.id) === String(encounter?.provider_id))
    const posRecord = encounter?.place_of_service || placesOfService.find(p => String(p.id) === String(encounter?.place_of_service_id))

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiClipboard />
                                {mode === 'edit' ? 'Edit Encounter' : 'Encounter Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading encounter..." variant="spinner" />
                                </div>
                            ) : !encounter ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {encounter.encounter_number}
                                                <span className={`badge bg-soft-${STATUS_COLORS[encounter.status] || 'secondary'} text-${STATUS_COLORS[encounter.status] || 'secondary'} text-capitalize ms-2`}>
                                                    {encounter.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">{encounter.patient ? `${encounter.patient.first_name} ${encounter.patient.last_name}` : 'N/A'}</p>
                                        </div>
                                        {hasPermission('medical_encounters.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Encounter Date" value={encounter.encounter_date} />
                                        <Field label="Provider" value={providerRecord ? `${providerRecord.first_name} ${providerRecord.last_name}` : null} />
                                        <Field label="Place of Service" value={posRecord ? `${posRecord.code} - ${posRecord.description}` : null} />
                                        <div className="col-md-12">
                                            <div className="text-muted small">Notes</div>
                                            <div className="fw-semibold">{encounter.notes || <span className="text-muted">—</span>}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <form id="encounter-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Provider <span className="text-danger">*</span></label>
                                            <select name="provider_id" className="form-select" value={formData.provider_id} onChange={handleInputChange} required disabled={isSaving}>
                                                <option value="">Select provider</option>
                                                {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Encounter Date <span className="text-danger">*</span></label>
                                            <input type="date" name="encounter_date" className="form-control" value={formData.encounter_date} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Place of Service</label>
                                            <select name="place_of_service_id" className="form-select" value={formData.place_of_service_id} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="">Select</option>
                                                {placesOfService.map(pos => <option key={pos.id} value={pos.id}>{pos.code} - {pos.description}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="open">Open</option>
                                                <option value="coding">Coding</option>
                                                <option value="ready">Ready</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Notes</label>
                                            <textarea name="notes" className="form-control" rows={3} value={formData.notes} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="modal-footer">
                            {mode === 'edit' ? (
                                <>
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                                        Cancel
                                    </button>
                                    <button type="submit" form="encounter-modal-form" className="btn btn-primary" disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="me-2" />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                    <FiX className="me-2" />
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}
