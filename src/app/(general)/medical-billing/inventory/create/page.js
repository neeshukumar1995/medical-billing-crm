'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiPackage } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const page = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({ item_name: '', sku: '', category: '', unit_of_measure: '', quantity_on_hand: 0, reorder_threshold: 0, unit_cost: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            const response = await crmInstance.post('/medical-billing/inventory-items', formData)
            if (response.status === 201) {
                Swal.fire({ title: 'Success!', text: 'Item added to inventory!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/inventory'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to add item'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiPackage /> Add Inventory Item</h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Item Name <span className="text-danger">*</span></label>
                                            <input type="text" name="item_name" className="form-control" value={formData.item_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">SKU <span className="text-danger">*</span></label>
                                            <input type="text" name="sku" className="form-control" value={formData.sku} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Category</label>
                                            <input type="text" name="category" className="form-control" value={formData.category} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Unit of Measure</label>
                                            <input type="text" name="unit_of_measure" className="form-control" placeholder="e.g. box, vial" value={formData.unit_of_measure} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Unit Cost</label>
                                            <input type="number" step="0.01" min="0" name="unit_cost" className="form-control" value={formData.unit_cost} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Starting Quantity on Hand</label>
                                            <input type="number" step="0.01" min="0" name="quantity_on_hand" className="form-control" value={formData.quantity_on_hand} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Reorder Threshold</label>
                                            <input type="number" step="0.01" min="0" name="reorder_threshold" className="form-control" value={formData.reorder_threshold} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                    </div>
                                    <div className="text-center mt-5">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creating...</> : <><FiSave className="me-2" />Create Item</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
