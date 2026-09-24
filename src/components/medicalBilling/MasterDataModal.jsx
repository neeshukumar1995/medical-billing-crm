'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiX, FiSave, FiHash } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { MEDICAL_CODE_MASTERS } from '@/utils/medicalCodeMasters'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const toFormData = (row, config) => ({
    code: row.code || '',
    description: row.description || '',
    status: row.status || 'active',
    ...(config.extraField ? { [config.extraField.name]: row[config.extraField.name] || '' } : {}),
})

// Generic view/edit modal for the 5 medical code master screens (ICD-10, CPT,
// HCPCS, Modifiers, Place of Service). They're all code + description + status
// (+ maybe one extra field), so one modal handles all 5 via the `type` prop.
export default function MasterDataModal({ type, recordId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()
    const config = MEDICAL_CODE_MASTERS[type]

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [record, setRecord] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(null)
    const [isSaving, setIsSaving] = useState(false)

    const fetchRecord = async () => {
        if (!config) return
        try {
            setLoading(true)
            // No single-record GET endpoint on these masters — pull from the list.
            const response = await crmInstance.get(config.endpoint, { params: { per_page: 1000 } })
            const list = response.data?.data || []
            const row = list.find(r => String(r.id) === String(recordId))
            if (!row) throw new Error('Record not found')
            setRecord(row)
            setFormData(toFormData(row, config))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load record.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (recordId && config) fetchRecord()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordId, type])

    if (!config) return null

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (record) setFormData(toFormData(record, config))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (record) setFormData(toFormData(record, config))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`${config.endpoint}/${recordId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: `${config.label.replace(/s$/, '')} updated successfully!`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchRecord()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update record'))
        } finally {
            setIsSaving(false)
        }
    }

    const singularLabel = config.label.replace(/s$/, '')

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiHash />
                                {mode === 'edit' ? `Edit ${singularLabel}` : `${singularLabel} Details`}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading record..." variant="spinner" />
                                </div>
                            ) : !record ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {record.code}
                                                <span className={`badge bg-soft-${record.status === 'active' ? 'success' : 'secondary'} text-${record.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {record.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">{record.description}</p>
                                        </div>
                                        {hasPermission('medical_coding.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    {config.extraField && (
                                        <div className="row g-4">
                                            <Field label={config.extraField.label} value={record[config.extraField.name]} />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <form id="master-data-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label">Code <span className="text-danger">*</span></label>
                                            <input type="text" name="code" className="form-control" value={formData.code} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-8">
                                            <label className="form-label">Description <span className="text-danger">*</span></label>
                                            <input type="text" name="description" className="form-control" value={formData.description} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        {config.extraField && (
                                            <div className="col-md-6">
                                                <label className="form-label">{config.extraField.label}</label>
                                                <input type="text" name={config.extraField.name} className="form-control" placeholder={config.extraField.placeholder} value={formData[config.extraField.name]} onChange={handleInputChange} disabled={isSaving} />
                                            </div>
                                        )}
                                        <div className="col-md-6">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
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
                                    <button type="submit" form="master-data-modal-form" className="btn btn-primary" disabled={isSaving}>
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
