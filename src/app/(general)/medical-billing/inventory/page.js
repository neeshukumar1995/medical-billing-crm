'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus, FiPackage, FiAlertTriangle } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import InventoryModal from '@/components/medicalBilling/InventoryModal'

const page = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const [items, setItems] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('low_stock') === '1')
    const [itemModal, setItemModal] = useState(null) // { id, mode } | null

    // Reading only the initial value above misses it when navigating here
    // client-side from a link that's already on this route (e.g. the
    // dashboard's "Low-Stock Items" card) — see the same fix on the
    // Follow-ups page for why a plain useState initializer isn't enough.
    useEffect(() => {
        setLowStockOnly(searchParams.get('low_stock') === '1')
    }, [searchParams])

    const fetchItems = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm
            if (lowStockOnly) params.low_stock = 1
            const response = await crmInstance.get('/medical-billing/inventory-items', { params })
            setItems(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load inventory.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setItems([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { const t = setTimeout(fetchItems, 300); return () => clearTimeout(t) }, [searchTerm, lowStockOnly])

    const handleAdjust = async (item) => {
        const { value: quantity } = await Swal.fire({
            title: `Adjust "${item.item_name}"`,
            text: `Current stock: ${item.quantity_on_hand}. Enter +/- quantity change:`,
            input: 'number',
            inputValue: 0,
            showCancelButton: true,
            confirmButtonText: 'Apply',
        })
        if (quantity === undefined || quantity === '' || Number(quantity) === 0) return
        try {
            await crmInstance.post(`/medical-billing/inventory-items/${item.id}/adjust`, { quantity: Number(quantity), note: 'Manual adjustment' })
            Swal.fire({ title: 'Adjusted!', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchItems()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to adjust stock.', icon: 'error' })
        }
    }

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({ title: `Delete "${name}"`, text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/inventory-items/${id}`)
            setItems(prev => prev.filter(i => i.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete item.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_inventory.manage') && (
                        <Link href="/medical-billing/inventory/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Item
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='d-flex justify-content-end gap-2 align-items-center'>
                                            <div className="form-check">
                                                <input type="checkbox" className="form-check-input" id="lowStock" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
                                                <label className="form-check-label" htmlFor="lowStock">Low stock only</label>
                                            </div>
                                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder='Name or SKU...' className="form-control form-control-sm" style={{ width: 220 }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} item${total === 1 ? '' : 's'}`}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Qty on Hand</th><th>Reorder At</th><th>Unit Cost</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading inventory..." variant="spinner" /></td></tr>
                                            ) : items.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No inventory items found.</td></tr>
                                            ) : (
                                                items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td><FiPackage className="me-2" />{item.item_name}</td>
                                                        <td>{item.sku}</td>
                                                        <td>{item.category || 'N/A'}</td>
                                                        <td>
                                                            {item.quantity_on_hand}
                                                            {item.is_low_stock && (
                                                                <span className="badge bg-soft-danger text-danger ms-2"><FiAlertTriangle size={12} className="me-1" />Low</span>
                                                            )}
                                                        </td>
                                                        <td>{item.reorder_threshold}</td>
                                                        <td>{item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : 'N/A'}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_inventory.manage') && (
                                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleAdjust(item)}>Adjust</button>
                                                                )}
                                                                {hasPermission('medical_inventory.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setItemModal({ id: item.id, mode: 'edit' })}><FiEdit3 /></button>
                                                                )}
                                                                {hasPermission('medical_inventory.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(item.id, item.item_name)}><FiTrash2 /></button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {itemModal && (
                <InventoryModal
                    itemId={itemModal.id}
                    initialMode={itemModal.mode}
                    onClose={() => setItemModal(null)}
                    onSaved={fetchItems}
                />
            )}
        </PermissionGuard>
    )
}

export default page
