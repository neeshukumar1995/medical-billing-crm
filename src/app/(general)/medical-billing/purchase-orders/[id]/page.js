'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiShoppingCart, FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import { usePermissions } from '@/hooks/usePermissions'

const STATUS_COLORS = { draft: 'secondary', submitted: 'info', received: 'success', cancelled: 'danger' }

const page = () => {
    const router = useRouter()
    const params = useParams()
    const { hasPermission } = usePermissions()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [order, setOrder] = useState(null)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    const load = async () => {
        try {
            setIsFetching(true)
            const response = await crmInstance.get(`/medical-billing/purchase-orders/${actualId}`)
            setOrder(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load purchase order.')
        } finally {
            setIsFetching(false)
        }
    }

    useEffect(() => { if (actualId) load() }, [actualId])

    const handleReceive = async () => {
        const result = await Swal.fire({ title: 'Receive Purchase Order', text: 'This will add the ordered quantities to inventory. Continue?', icon: 'question', showCancelButton: true, confirmButtonText: 'Receive', confirmButtonColor: '#007bff' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/purchase-orders/${actualId}/receive`)
            Swal.fire({ title: 'Received!', text: 'Inventory updated.', icon: 'success', timer: 1500, showConfirmButton: false })
            load()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to receive PO.', icon: 'error' })
        }
    }

    const handleDelete = async () => {
        const result = await Swal.fire({ title: 'Delete Purchase Order', text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/purchase-orders/${actualId}`)
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
                .then(() => router.push('/medical-billing/purchase-orders'))
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete PO.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.view" redirect={false}>
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
                                {error && <div className="alert alert-danger">{error}</div>}
                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading purchase order..." variant="spinner" /></div>
                                ) : order && (
                                    <>
                                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                            <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2 mb-0"><FiShoppingCart /> {order.order_number}</h2>
                                            <div className="hstack gap-2">
                                                {hasPermission('medical_inventory.manage') && order.status !== 'received' && order.status !== 'cancelled' && (
                                                    <button type="button" className="btn btn-primary" onClick={handleReceive}><FiCheckCircle className="me-2" />Receive</button>
                                                )}
                                                {hasPermission('medical_inventory.manage') && order.status !== 'received' && (
                                                    <button type="button" className="btn btn-outline-danger" onClick={handleDelete}><FiTrash2 className="me-2" />Delete</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="row g-4 mb-4">
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Vendor</label>
                                                <p className="fw-semibold mb-0">{order.vendor?.name || 'N/A'}</p>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Order Date</label>
                                                <p className="fw-semibold mb-0">{order.order_date}</p>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Expected Date</label>
                                                <p className="fw-semibold mb-0">{order.expected_date || 'N/A'}</p>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Status</label>
                                                <p className="mb-0"><span className={`badge bg-soft-${STATUS_COLORS[order.status] || 'secondary'} text-${STATUS_COLORS[order.status] || 'secondary'} text-capitalize`}>{order.status}</span></p>
                                            </div>
                                        </div>
                                        <h5 className="mb-3">Order Lines</h5>
                                        <div className="table-responsive">
                                            <table className="table table-hover">
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
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
