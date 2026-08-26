'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiShoppingCart, FiCheckCircle, FiTrash2, FiX } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'

const STATUS_COLORS = { draft: 'secondary', submitted: 'info', received: 'success', cancelled: 'danger' }

export default function PurchaseOrderModal({ poId, onClose, onSaved }) {
    const { hasPermission } = usePermissions()

    const [order, setOrder] = useState(null)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    const load = async () => {
        try {
            setIsFetching(true)
            const response = await crmInstance.get(`/medical-billing/purchase-orders/${poId}`)
            setOrder(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load purchase order.')
        } finally {
            setIsFetching(false)
        }
    }

    useEffect(() => {
        if (poId) load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poId])

    const handleReceive = async () => {
        const result = await Swal.fire({ title: 'Receive Purchase Order', text: 'This will add the ordered quantities to inventory. Continue?', icon: 'question', showCancelButton: true, confirmButtonText: 'Receive', confirmButtonColor: '#007bff' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/purchase-orders/${poId}/receive`)
            Swal.fire({ title: 'Received!', text: 'Inventory updated.', icon: 'success', timer: 1500, showConfirmButton: false })
            await load()
            onSaved && onSaved()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to receive PO.', icon: 'error' })
        }
    }

    const handleDelete = async () => {
        const result = await Swal.fire({ title: 'Delete Purchase Order', text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/purchase-orders/${poId}`)
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
            onSaved && onSaved()
            onClose && onClose()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete PO.', icon: 'error' })
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiShoppingCart />
                                {order ? order.order_number : 'Purchase Order'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {isFetching ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading purchase order..." variant="spinner" />
                                </div>
                            ) : order && (
                                <>
                                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                        <span className={`badge bg-soft-${STATUS_COLORS[order.status] || 'secondary'} text-${STATUS_COLORS[order.status] || 'secondary'} text-capitalize`}>
                                            {order.status}
                                        </span>
                                        <div className="hstack gap-2">
                                            {hasPermission('medical_inventory.manage') && order.status !== 'received' && order.status !== 'cancelled' && (
                                                <button type="button" className="btn btn-primary btn-sm" onClick={handleReceive}><FiCheckCircle className="me-2" />Receive</button>
                                            )}
                                            {hasPermission('medical_inventory.manage') && order.status !== 'received' && (
                                                <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete}><FiTrash2 className="me-2" />Delete</button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-4">
                                            <label className="form-label text-muted">Vendor</label>
                                            <p className="fw-semibold mb-0">{order.vendor?.name || 'N/A'}</p>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label text-muted">Order Date</label>
                                            <p className="fw-semibold mb-0">{order.order_date}</p>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label text-muted">Expected Date</label>
                                            <p className="fw-semibold mb-0">{order.expected_date || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <h6 className="mb-3">Order Lines</h6>
                                    <div className="table-responsive">
                                        <table className="table table-hover table-sm">
                                            <thead><tr><th>Item</th><th>SKU</th><th>Quantity</th><th>Unit Cost</th><th>Line Total</th></tr></thead>
                                            <tbody>
                                                {(order.items || []).map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{item.inventory_item?.item_name || 'N/A'}</td>
                                                        <td>{item.inventory_item?.sku || 'N/A'}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>${Number(item.unit_cost).toFixed(2)}</td>
                                                        <td>${Number(item.line_total).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr><td colSpan="4" className="text-end fw-bold">Total</td><td className="fw-bold">${Number(order.total_amount).toFixed(2)}</td></tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                <FiX className="me-2" />
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}
