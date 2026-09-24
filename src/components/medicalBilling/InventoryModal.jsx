'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiPackage, FiX, FiSave, FiAlertTriangle } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyForm = {
    item_name: '',
    sku: '',
    category: '',
    unit_of_measure: '',
    reorder_threshold: 0,
    unit_cost: '',
    status: 'active',
}

const toFormData = (i) => ({
    item_name: i.item_name || '',
    sku: i.sku || '',
    category: i.category || '',
    unit_of_measure: i.unit_of_measure || '',
    reorder_threshold: i.reorder_threshold || 0,
    unit_cost: i.unit_cost || '',
    status: i.status || 'active',
})

export default function InventoryModal({ itemId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [isSaving, setIsSaving] = useState(false)

    const fetchItem = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/inventory-items/${itemId}`)
            setItem(response.data)
            setFormData(toFormData(response.data))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load item.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (itemId) fetchItem()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (item) setFormData(toFormData(item))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (item) setFormData(toFormData(item))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/inventory-items/${itemId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Item updated!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchItem()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update item'))
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
                                <FiPackage />
                                {mode === 'edit' ? 'Edit Inventory Item' : 'Inventory Item Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading item..." variant="spinner" />
                                </div>
                            ) : !item ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {item.item_name}
                                                <span className={`badge bg-soft-${item.status === 'active' ? 'success' : 'secondary'} text-${item.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {item.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">
                                                SKU {item.sku}
                                                {item.is_low_stock && (
                                                    <span className="badge bg-soft-danger text-danger ms-2"><FiAlertTriangle size={12} className="me-1" />Low Stock</span>
                                                )}
                                            </p>
                                        </div>
                                        {hasPermission('medical_inventory.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Item Name" value={item.item_name} />
                                        <Field label="SKU" value={item.sku} />
                                        <Field label="Category" value={item.category} />
                                        <Field label="Unit of Measure" value={item.unit_of_measure} />
                                        <Field label="Unit Cost" value={item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : null} />
                                        <Field label="Reorder Threshold" value={item.reorder_threshold} />
                                        <Field label="Quantity on Hand" value={item.quantity_on_hand} />
                                    </div>
                                    <p className="text-muted small mt-3 mb-0">Use "Adjust" from the inventory list to change stock levels.</p>
                                </>
                            ) : (
                                <form id="inventory-modal-form" onSubmit={handleSubmit}>
                                    <p className="text-muted small mb-3">Current stock: {item.quantity_on_hand} (use "Adjust" on the list page to change stock)</p>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Item Name <span className="text-danger">*</span></label>
                                            <input type="text" name="item_name" className="form-control" value={formData.item_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">SKU <span className="text-danger">*</span></label>
                                            <input type="text" name="sku" className="form-control" value={formData.sku} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Category</label>
                                            <input type="text" name="category" className="form-control" value={formData.category} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Unit of Measure</label>
                                            <input type="text" name="unit_of_measure" className="form-control" value={formData.unit_of_measure} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Unit Cost</label>
                                            <input type="number" step="0.01" min="0" name="unit_cost" className="form-control" value={formData.unit_cost} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Reorder Threshold</label>
                                            <input type="number" step="0.01" min="0" name="reorder_threshold" className="form-control" value={formData.reorder_threshold} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
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
                                    <button type="submit" form="inventory-modal-form" className="btn btn-primary" disabled={isSaving}>
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
