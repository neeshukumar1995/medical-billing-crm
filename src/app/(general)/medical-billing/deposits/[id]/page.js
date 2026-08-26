'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiFileText, FiPlus, FiTrash2, FiCheckCircle, FiCheck } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import { usePermissions } from '@/hooks/usePermissions'

const STATUS_COLORS = { pending: 'secondary', deposited: 'info', reconciled: 'success' }

const page = () => {
    const router = useRouter()
    const params = useParams()
    const { hasPermission } = usePermissions()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [deposit, setDeposit] = useState(null)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')
    const [availablePayments, setAvailablePayments] = useState([])
    const [selectedPayment, setSelectedPayment] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    const load = async () => {
        try {
            setIsFetching(true)
            const response = await crmInstance.get(`/medical-billing/deposits/${actualId}`)
            setDeposit(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load deposit.')
        } finally {
            setIsFetching(false)
        }
    }

    const loadAvailablePayments = async () => {
        try {
            const response = await crmInstance.get('/medical-billing/deposits/available-payments')
            setAvailablePayments(response.data || [])
        } catch {
            setAvailablePayments([])
        }
    }

    useEffect(() => { if (actualId) load() }, [actualId])
    useEffect(() => { if (deposit?.status === 'pending') loadAvailablePayments() }, [deposit?.status])

    const handleAddItem = async () => {
        if (!selectedPayment) return
        const payment = availablePayments.find(p => `${p.depositable_type}:${p.depositable_id}` === selectedPayment)
        if (!payment) return
        try {
            setIsAdding(true)
            await crmInstance.post(`/medical-billing/deposits/${actualId}/items`, {
                depositable_type: payment.depositable_type,
                depositable_id: payment.depositable_id,
            })
            setSelectedPayment('')
            await load()
            await loadAvailablePayments()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to add payment.', icon: 'error' })
        } finally {
            setIsAdding(false)
        }
    }

    const handleRemoveItem = async (itemId) => {
        const result = await Swal.fire({ title: 'Remove Payment', text: 'Remove this payment from the deposit?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/deposits/${actualId}/items/${itemId}`)
            await load()
            await loadAvailablePayments()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to remove payment.', icon: 'error' })
        }
    }

    const handleMarkDeposited = async () => {
        const result = await Swal.fire({ title: 'Mark as Deposited', text: 'Confirm this batch has been deposited at the bank?', icon: 'question', showCancelButton: true, confirmButtonText: 'Confirm', confirmButtonColor: '#007bff' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/deposits/${actualId}/mark-deposited`)
            Swal.fire({ title: 'Marked as Deposited!', icon: 'success', timer: 1500, showConfirmButton: false })
            load()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to mark deposited.', icon: 'error' })
        }
    }

    const handleReconcile = async () => {
        const result = await Swal.fire({ title: 'Reconcile Deposit', text: 'Confirm this deposit has been matched against the bank statement?', icon: 'question', showCancelButton: true, confirmButtonText: 'Reconcile', confirmButtonColor: '#007bff' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.post(`/medical-billing/deposits/${actualId}/reconcile`)
            Swal.fire({ title: 'Reconciled!', icon: 'success', timer: 1500, showConfirmButton: false })
            load()
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to reconcile.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_deposits.view" redirect={false}>
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
                                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading deposit..." variant="spinner" /></div>
                                ) : deposit && (
                                    <>
                                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                            <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                                                <FiFileText /> {deposit.deposit_reference || `Deposit #${deposit.id}`}
                                            </h2>
                                            <div className="hstack gap-2">
                                                {hasPermission('medical_deposits.manage') && deposit.status === 'pending' && (
                                                    <button type="button" className="btn btn-primary" onClick={handleMarkDeposited}><FiCheckCircle className="me-2" />Mark Deposited</button>
                                                )}
                                                {hasPermission('medical_deposits.manage') && deposit.status === 'deposited' && (
                                                    <button type="button" className="btn btn-success" onClick={handleReconcile}><FiCheck className="me-2" />Reconcile</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="row g-4 mb-4">
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Bank Account</label>
                                                <p className="fw-semibold mb-0">{deposit.bank_account ? `${deposit.bank_account.account_name} — ${deposit.bank_account.bank_name}` : 'N/A'}</p>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Deposit Date</label>
                                                <p className="fw-semibold mb-0">{deposit.deposit_date}</p>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Total</label>
                                                <p className="fw-semibold mb-0">${Number(deposit.total_amount).toFixed(2)}</p>
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label text-muted">Status</label>
                                                <p className="mb-0"><span className={`badge bg-soft-${STATUS_COLORS[deposit.status] || 'secondary'} text-${STATUS_COLORS[deposit.status] || 'secondary'} text-capitalize`}>{deposit.status}</span></p>
                                            </div>
                                        </div>

                                        {hasPermission('medical_deposits.manage') && deposit.status === 'pending' && (
                                            <div className="d-flex gap-2 align-items-end mb-4">
                                                <div style={{ minWidth: 320 }}>
                                                    <label className="form-label">Add Payment to Deposit</label>
                                                    <select className="form-select" value={selectedPayment} onChange={(e) => setSelectedPayment(e.target.value)} disabled={isAdding}>
                                                        <option value="">Select a posted payment</option>
                                                        {availablePayments.map(p => (
                                                            <option key={`${p.depositable_type}:${p.depositable_id}`} value={`${p.depositable_type}:${p.depositable_id}`}>
                                                                {p.label} — ${Number(p.amount).toFixed(2)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button type="button" className="btn btn-outline-primary" onClick={handleAddItem} disabled={isAdding || !selectedPayment}>
                                                    <FiPlus className="me-1" /> Add
                                                </button>
                                            </div>
                                        )}

                                        <h5 className="mb-3">Deposit Items</h5>
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead><tr><th>Type</th><th>Reference</th><th>Amount</th>{deposit.status === 'pending' && <th className="text-end">Actions</th>}</tr></thead>
                                                <tbody>
                                                    {(deposit.items || []).length === 0 ? (
                                                        <tr><td colSpan="4" className="text-center py-3">No payments added yet.</td></tr>
                                                    ) : (
                                                        deposit.items.map((item) => (
                                                            <tr key={item.id}>
                                                                <td className="text-capitalize">{item.depositable_type?.replace('_', ' ')}</td>
                                                                <td>{item.depositable?.receipt_number || item.depositable?.payment_reference || `#${item.depositable_id}`}</td>
                                                                <td>${Number(item.amount).toFixed(2)}</td>
                                                                {deposit.status === 'pending' && (
                                                                    <td className="text-end">
                                                                        {hasPermission('medical_deposits.manage') && (
                                                                            <button type="button" className="avatar-text avatar-md" title="Remove" onClick={() => handleRemoveItem(item.id)}><FiTrash2 /></button>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                                <tfoot>
                                                    <tr><td colSpan={deposit.status === 'pending' ? 2 : 2} className="text-end fw-bold">Total</td><td className="fw-bold">${Number(deposit.total_amount).toFixed(2)}</td>{deposit.status === 'pending' && <td></td>}</tr>
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
