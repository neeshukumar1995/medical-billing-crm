'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiShoppingCart, FiPlus, FiTrash2 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyItem = { inventory_item_id: '', quantity: 1, unit_cost: '' }

const page = () => {
    const router = useRouter()
    const [vendorId, setVendorId] = useState('')
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
    const [expectedDate, setExpectedDate] = useState('')
    const [items, setItems] = useState([{ ...emptyItem }])

    const [vendors, setVendors] = useState([])
    const [inventoryItems, setInventoryItems] = useState([])

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const [vendorRes, invRes] = await Promise.all([
                    crmInstance.get('/medical-billing/vendors', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/inventory-items', { params: { per_page: 500 } }),
                ])
                setVendors(vendorRes.data?.data || [])
                setInventoryItems(invRes.data?.data || [])
            } catch {
                // dropdowns stay empty
            }
        })()
    }, [])

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((it, i) => {
            if (i !== index) return it
            const updated = { ...it, [field]: value }
            if (field === 'inventory_item_id') {
                const invItem = inventoryItems.find(x => String(x.id) === String(value))
                if (invItem?.unit_cost && !it.unit_cost) updated.unit_cost = invItem.unit_cost
            }
            return updated
        }))
    }

    const addItem = () => setItems(prev => [...prev, { ...emptyItem }])
    const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))

    const total = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_cost || 0)), 0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                vendor_id: vendorId,
                order_date: orderDate,
                expected_date: expectedDate || null,
                items: items.map(it => ({
                    inventory_item_id: it.inventory_item_id,
                    quantity: it.quantity,
                    unit_cost: it.unit_cost,
                })),
            }
            const response = await crmInstance.post('/medical-billing/purchase-orders', payload)
            if (response.status === 201) {
                Swal.fire({ title: 'Success!', text: 'Purchase order created!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/purchase-orders'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to create purchase order'))
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
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiShoppingCart /> New Purchase Order</h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Vendor <span className="text-danger">*</span></label>
                                            <select className="form-select" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required disabled={isLoading}>
                                                <option value="">Select vendor</option>
                                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Order Date <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Expected Date</label>
                                            <input type="date" className="form-control" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} min={orderDate} disabled={isLoading} />
                                        </div>
                                    </div>

                                    <h5 className="mb-3">Order Lines</h5>
                                    {items.map((item, index) => (
                                        <div key={index} className="border rounded p-3 mb-3">
                                            <div className="row g-3">
                                                <div className="col-md-5">
                                                    <label className="form-label">Inventory Item <span className="text-danger">*</span></label>
                                                    <select className="form-select" value={item.inventory_item_id} onChange={(e) => updateItem(index, 'inventory_item_id', e.target.value)} required disabled={isLoading}>
                                                        <option value="">Select item</option>
                                                        {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.sku})</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Quantity <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" min="0.01" className="form-control" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required disabled={isLoading} />
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Unit Cost <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" min="0" className="form-control" value={item.unit_cost} onChange={(e) => updateItem(index, 'unit_cost', e.target.value)} required disabled={isLoading} />
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Line Total</label>
                                                    <input type="text" className="form-control" disabled value={`$${(Number(item.quantity || 0) * Number(item.unit_cost || 0)).toFixed(2)}`} />
                                                </div>
                                                <div className="col-md-1 d-flex align-items-end">
                                                    {items.length > 1 && (
                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeItem(index)} disabled={isLoading}>
                                                            <FiTrash2 />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button type="button" className="btn btn-sm btn-outline-primary mb-4" onClick={addItem} disabled={isLoading}>
                                        <FiPlus className="me-1" /> Add Line
                                    </button>

                                    <div className="text-end mb-4">
                                        <strong>Total: ${total.toFixed(2)}</strong>
                                    </div>

                                    <div className="text-center">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Create Purchase Order
                                                </>
                                            )}
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
