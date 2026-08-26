'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiUserCheck, FiX, FiSave } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyForm = {
    first_name: '',
    last_name: '',
    npi: '',
    taxonomy_code: '',
    specialty: '',
    tax_id: '',
    license_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
}

const toFormData = (p) => ({
    first_name: p.first_name || '',
    last_name: p.last_name || '',
    npi: p.npi || '',
    taxonomy_code: p.taxonomy_code || '',
    specialty: p.specialty || '',
    tax_id: p.tax_id || '',
    license_number: p.license_number || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    zip_code: p.zip_code || '',
})

export default function ProviderModal({ providerId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [provider, setProvider] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [isSaving, setIsSaving] = useState(false)

    const fetchProvider = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/providers/${providerId}`)
            setProvider(response.data)
            setFormData(toFormData(response.data))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load provider.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (providerId) fetchProvider()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (provider) setFormData(toFormData(provider))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (provider) setFormData(toFormData(provider))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/providers/${providerId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Provider updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchProvider()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update provider'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiUserCheck />
                                {mode === 'edit' ? 'Edit Provider' : 'Provider Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading provider..." variant="spinner" />
                                </div>
                            ) : !provider ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {provider.first_name} {provider.last_name}
                                                <span className={`badge bg-soft-${provider.status === 'active' ? 'success' : 'secondary'} text-${provider.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {provider.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">NPI: {provider.npi || 'N/A'}</p>
                                        </div>
                                        {hasPermission('medical_providers.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Taxonomy Code" value={provider.taxonomy_code} />
                                        <Field label="Specialty" value={provider.specialty} />
                                        <Field label="Tax ID" value={provider.tax_id} />
                                        <Field label="License Number" value={provider.license_number} />
                                        <Field label="Phone" value={provider.phone} />
                                        <Field label="Email" value={provider.email} />
                                        <Field label="Address" value={provider.address} />
                                        <Field label="City" value={provider.city} />
                                        <Field label="State" value={provider.state} />
                                        <Field label="Zip Code" value={provider.zip_code} />
                                    </div>
                                </>
                            ) : (
                                <form id="provider-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label">First Name <span className="text-danger">*</span></label>
                                            <input type="text" name="first_name" className="form-control" value={formData.first_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Last Name <span className="text-danger">*</span></label>
                                            <input type="text" name="last_name" className="form-control" value={formData.last_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">NPI</label>
                                            <input type="text" name="npi" className="form-control" value={formData.npi} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Taxonomy Code</label>
                                            <input type="text" name="taxonomy_code" className="form-control" value={formData.taxonomy_code} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Specialty</label>
                                            <input type="text" name="specialty" className="form-control" value={formData.specialty} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Tax ID</label>
                                            <input type="text" name="tax_id" className="form-control" value={formData.tax_id} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">License Number</label>
                                            <input type="text" name="license_number" className="form-control" value={formData.license_number} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Email</label>
                                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Address</label>
                                            <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">City</label>
                                            <input type="text" name="city" className="form-control" value={formData.city} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">State</label>
                                            <input type="text" name="state" className="form-control" value={formData.state} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Zip Code</label>
                                            <input type="text" name="zip_code" className="form-control" value={formData.zip_code} onChange={handleInputChange} disabled={isSaving} />
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
                                    <button type="submit" form="provider-modal-form" className="btn btn-primary" disabled={isSaving}>
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
