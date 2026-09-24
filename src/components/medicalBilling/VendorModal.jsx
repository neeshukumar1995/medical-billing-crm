'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiBriefcase, FiX, FiSave } from 'react-icons/fi'
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
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
}

const toFormData = (v) => ({
    name: v.name || '',
    contact_name: v.contact_name || '',
    phone: v.phone || '',
    email: v.email || '',
    address: v.address || '',
    status: v.status || 'active',
})

export default function VendorModal({ vendorId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [vendor, setVendor] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [isSaving, setIsSaving] = useState(false)

    const fetchVendor = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get('/medical-billing/vendors', { params: { per_page: 1000 } })
            const list = response.data?.data || []
            const found = list.find(x => String(x.id) === String(vendorId))
            if (!found) throw new Error('Vendor not found')
            setVendor(found)
            setFormData(toFormData(found))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load vendor.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (vendorId) fetchVendor()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendorId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (vendor) setFormData(toFormData(vendor))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (vendor) setFormData(toFormData(vendor))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/vendors/${vendorId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Vendor updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchVendor()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update vendor'))
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
                                <FiBriefcase />
                                {mode === 'edit' ? 'Edit Vendor' : 'Vendor Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading vendor..." variant="spinner" />
                                </div>
                            ) : !vendor ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {vendor.name}
                                                <span className={`badge bg-soft-${vendor.status === 'active' ? 'success' : 'secondary'} text-${vendor.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {vendor.status}
                                                </span>
                                            </h4>
                                            {vendor.contact_name && <p className="text-muted mb-0">{vendor.contact_name}</p>}
                                        </div>
                                        {hasPermission('medical_inventory.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Vendor Name" value={vendor.name} />
                                        <Field label="Contact Name" value={vendor.contact_name} />
                                        <Field label="Phone" value={vendor.phone} />
                                        <Field label="Email" value={vendor.email} />
                                        <Field label="Address" value={vendor.address} />
                                        <Field label="Status" value={vendor.status} />
                                    </div>
                                </>
                            ) : (
                                <form id="vendor-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Vendor Name <span className="text-danger">*</span></label>
                                            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Contact Name</label>
                                            <input type="text" name="contact_name" className="form-control" value={formData.contact_name} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Email</label>
                                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-8">
                                            <label className="form-label">Address</label>
                                            <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
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
                                    <button type="submit" form="vendor-modal-form" className="btn btn-primary" disabled={isSaving}>
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
