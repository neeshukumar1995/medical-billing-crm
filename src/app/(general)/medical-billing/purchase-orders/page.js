'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiPlus, FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import PurchaseOrderModal from '@/components/medicalBilling/PurchaseOrderModal'

const STATUS_COLORS = { draft: 'secondary', submitted: 'info', received: 'success', cancelled: 'danger' }

const page = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const [orders, setOrders] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState(searchParams.get('bucket') === 'pending' ? '__pending__' : (searchParams.get('status') || ''))
    const [openPoId, setOpenPoId] = useState(null)

    // Re-sync on client-side navigation to this same route with a different
    // ?bucket=/?status= (e.g. the dashboard's "Pending Purchase Orders" card)
    // — a plain useState initializer only runs once and misses that.
    useEffect(() => {
        setStatusFilter(searchParams.get('bucket') === 'pending' ? '__pending__' : (searchParams.get('status') || ''))
    }, [searchParams])

    const fetchOrders = async () => {
        try {
            setLoading(true)
            const params = {}
            // "__pending__" isn't a real status — it's draft OR submitted,
            // matching the dashboard's "Pending Purchase Orders" count,
            // which no single status value can express.
            if (statusFilter === '__pending__') params.bucket = 'pending'
            else if (statusFilter) params.status = statusFilter
            const response = await crmInstance.get('/medical-billing/purchase-orders', { params })
            setOrders(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load purchase orders.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setOrders([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchOrders() }, [statusFilter])

    const handleReceive = async (po) => {
        const result = await Swal.fire({ title: 'Receive Purchase Order', text: 'This will add the ordered quantities to inventory. Continue?', icon: 'question', showCancelButton: true, confirmButtonText: 'Receive', confirmButtonColor: '#007bff' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/purchase-orders/${po.id}/receive`)
            Swal.fire({ title: 'Received!', text: 'Inventory updated.', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchOrders()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to receive PO.', icon: 'error' })
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Delete Purchase Order', text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/purchase-orders/${id}`)
            setOrders(prev => prev.filter(o => o.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete PO.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_inventory.manage') && (
                        <Link href="/medical-billing/purchase-orders/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Purchase Order
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
                                        <div className='d-flex justify-content-end'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="__pending__">Pending (Draft + Submitted)</option>
                                                <option value="draft">Draft</option>
                                                <option value="submitted">Submitted</option>
                                                <option value="received">Received</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} order${total === 1 ? '' : 's'}`}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead><tr><th>PO #</th><th>Vendor</th><th>Order Date</th><th>Lines</th><th>Total</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading purchase orders..." variant="spinner" /></td></tr>
                                            ) : orders.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No purchase orders found.</td></tr>
                                            ) : (
                                                orders.map((po) => (
                                                    <tr key={po.id}>
                                                        <td><button type="button" className="btn btn-link p-0 align-baseline" onClick={() => setOpenPoId(po.id)}>{po.order_number}</button></td>
                                                        <td>{po.vendor?.name || 'N/A'}</td>
                                                        <td>{po.order_date}</td>
                                                        <td>{po.items_count}</td>
                                                        <td>${Number(po.total_amount).toFixed(2)}</td>
                                                        <td><span className={`badge bg-soft-${STATUS_COLORS[po.status] || 'secondary'} text-${STATUS_COLORS[po.status] || 'secondary'} text-capitalize`}>{po.status}</span></td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_inventory.manage') && po.status !== 'received' && po.status !== 'cancelled' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Receive" onClick={() => handleReceive(po)}><FiCheckCircle /></button>
                                                                )}
                                                                {hasPermission('medical_inventory.manage') && po.status !== 'received' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(po.id)}><FiTrash2 /></button>
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

            {openPoId && (
                <PurchaseOrderModal
                    poId={openPoId}
                    onClose={() => setOpenPoId(null)}
                    onSaved={fetchOrders}
                />
            )}
        </PermissionGuard>
    )
}

export default page
