'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiX, FiSave, FiShield } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyForm = {
    name: '',
    payer_id: '',
    payer_type: '',
    phone: '',
    address: '',
    website: '',
    status: 'active',
}

const toFormData = (p) => ({
    name: p.name || '',
    payer_id: p.payer_id || '',
    payer_type: p.payer_type || '',
    phone: p.phone || '',
    address: p.address || '',
    website: p.website || '',
    status: p.status || 'active',
})

export default function InsurancePayerModal({ payerId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [payer, setPayer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [isSaving, setIsSaving] = useState(false)

    const fetchPayer = async () => {
        try {
            setLoading(true)
            // No single-payer GET endpoint — pull it from the list, same as the old edit page.
            const response = await crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 1000 } })
            const list = response.data?.data || []
            const p = list.find(x => String(x.id) === String(payerId))
            if (!p) throw new Error('Payer not found')
            setPayer(p)
            setFormData(toFormData(p))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load payer.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (payerId) fetchPayer()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payerId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (payer) setFormData(toFormData(payer))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (payer) setFormData(toFormData(payer))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/insurance/payers/${payerId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Payer updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchPayer()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update payer'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiShield />
                                {mode === 'edit' ? 'Edit Insurance Payer' : 'Payer Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading payer..." variant="spinner" />
                                </div>
                            ) : !payer ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {payer.name}
                                                <span className={`badge bg-soft-${payer.status === 'active' ? 'success' : 'secondary'} text-${payer.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {payer.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">Payer ID: {payer.payer_id || 'N/A'}</p>
                                        </div>
                                        {hasPermission('medical_insurance.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Payer Type" value={payer.payer_type} />
                                        <Field label="Phone" value={payer.phone} />
                                        <Field label="Website" value={payer.website} />
                                        <div className="col-md-12">
                                            <div className="text-muted small">Address</div>
                                            <div className="fw-semibold">{payer.address || <span className="text-muted">—</span>}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <form id="payer-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Payer Name <span className="text-danger">*</span></label>
                                            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Payer ID</label>
                                            <input type="text" name="payer_id" className="form-control" value={formData.payer_id} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Payer Type</label>
                                            <select name="payer_type" className="form-select" value={formData.payer_type} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="">Select</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="medicare">Medicare</option>
                                                <option value="medicaid">Medicaid</option>
                                                <option value="workers_comp">Workers' Comp</option>
                                                <option value="self_pay">Self Pay</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Website</label>
                                            <input type="text" name="website" className="form-control" value={formData.website} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Address</label>
                                            <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isSaving} />
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
                                    <button type="submit" form="payer-modal-form" className="btn btn-primary" disabled={isSaving}>
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
