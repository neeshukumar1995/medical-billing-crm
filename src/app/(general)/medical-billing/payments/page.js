'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiPlus, FiCheck, FiRotateCcw, FiTrash2 } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'

const STATUS_COLORS = { unposted: 'secondary', posted: 'success', reversed: 'danger' }

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [payments, setPayments] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const fetchPayments = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter
            const response = await crmInstance.get('/medical-billing/payments', { params })
            setPayments(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load payments.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setPayments([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPayments() }, [statusFilter])

    const handlePost = async (payment) => {
        const result = await Swal.fire({
            title: 'Post Payment', text: 'This will apply the allocations to their claims. Continue?', icon: 'question',
            showCancelButton: true, confirmButtonText: 'Post', confirmButtonColor: '#007bff'
        })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/payments/${payment.id}/post`)
            Swal.fire({ title: 'Posted!', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchPayments()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to post payment.', icon: 'error' })
        }
    }

    const handleReverse = async (payment) => {
        const result = await Swal.fire({
            title: 'Reverse Payment', text: 'This will remove the applied amounts from the linked claims. Continue?', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Reverse', confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/payments/${payment.id}/reverse`)
            Swal.fire({ title: 'Reversed!', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchPayments()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to reverse payment.', icon: 'error' })
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Delete Payment', text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/payments/${id}`)
            setPayments(prev => prev.filter(p => p.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete payment.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_payments.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_payments.manage') && (
                        <Link href="/medical-billing/payments/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Post Payment
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
                                                <option value="unposted">Unposted</option>
                                                <option value="posted">Posted</option>
                                                <option value="reversed">Reversed</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} payment${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Payer</th>
                                                <th>Reference</th>
                                                <th>Method</th>
                                                <th>Amount</th>
                                                <th>Lines</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="8" className="text-center py-4"><Spinner label="Loading payments..." variant="spinner" /></td></tr>
                                            ) : payments.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center py-4">No payments found.</td></tr>
                                            ) : (
                                                payments.map((p) => (
                                                    <tr key={p.id}>
                                                        <td>{p.payment_date}</td>
                                                        <td>{p.payer?.name || 'N/A'}</td>
                                                        <td>{p.payment_reference || 'N/A'}</td>
                                                        <td>{p.payment_method || 'N/A'}</td>
                                                        <td>${Number(p.payment_amount).toFixed(2)}</td>
                                                        <td>{p.items_count}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[p.status] || 'secondary'} text-${STATUS_COLORS[p.status] || 'secondary'} text-capitalize`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_payments.manage') && p.status === 'unposted' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Post" onClick={() => handlePost(p)}>
                                                                        <FiCheck />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_payments.manage') && p.status === 'posted' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Reverse" onClick={() => handleReverse(p)}>
                                                                        <FiRotateCcw />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_payments.manage') && p.status !== 'posted' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(p.id)}>
                                                                        <FiTrash2 />
                                                                    </button>
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
        </PermissionGuard>
    )
}

export default page
