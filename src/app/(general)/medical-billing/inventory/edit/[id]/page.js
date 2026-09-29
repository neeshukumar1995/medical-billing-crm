'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiEdit3 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [formData, setFormData] = useState({ item_name: '', sku: '', category: '', unit_of_measure: '', reorder_threshold: 0, unit_cost: '', status: 'active' })
    const [quantityOnHand, setQuantityOnHand] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get(`/medical-billing/inventory-items/${actualId}`)
                const item = response.data
                setFormData({
                    item_name: item.item_name || '', sku: item.sku || '', category: item.category || '',
                    unit_of_measure: item.unit_of_measure || '', reorder_threshold: item.reorder_threshold || 0,
                    unit_cost: item.unit_cost || '', status: item.status || 'active',
                })
                setQuantityOnHand(item.quantity_on_hand)
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load item.')
            } finally {
                setIsFetching(false)
            }
        }
        if (actualId) load()
    }, [actualId])

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            const response = await crmInstance.put(`/medical-billing/inventory-items/${actualId}`, formData)
            if (response.status === 200) {
                Swal.fire({ title: 'Success!', text: 'Item updated!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/inventory'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update item'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiEdit3 /> Edit Inventory Item</h2>
                                {!isFetching && <p className="text-muted small mb-0">Current stock: {quantityOnHand} (use "Adjust" on the list page to change stock)</p>}
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}
                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading item..." variant="spinner" /></div>
                                ) : (
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
                                                <input type="text" name="unit_of_measure" className="form-control" value={formData.unit_of_measure} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Unit Cost</label>
                                                <input type="number" step="0.01" min="0" name="unit_cost" className="form-control" value={formData.unit_cost} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Reorder Threshold</label>
                                                <input type="number" step="0.01" min="0" name="reorder_threshold" className="form-control" value={formData.reorder_threshold} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Status</label>
                                                <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="text-center mt-5 d-flex gap-3 justify-content-center">
                                            <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                                {isLoading ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</> : <><FiSave className="me-2" />Update Item</>}
                                            </button>
                                            <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/inventory')} disabled={isLoading}>Cancel</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
