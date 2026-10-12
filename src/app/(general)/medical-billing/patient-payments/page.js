'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiTrash2, FiPlus, FiFileText } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import PatientPaymentModal from '@/components/medicalBilling/PatientPaymentModal'
import { formatDate } from '@/utils/formatDate'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [payments, setPayments] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [openPaymentId, setOpenPaymentId] = useState(null)

    const fetchPayments = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get('/medical-billing/patient-payments')
            setPayments(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load patient payments.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setPayments([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPayments() }, [])

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Delete Payment Record', text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/patient-payments/${id}`)
            setPayments(prev => prev.filter(p => p.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete payment.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_receipts.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_receipts.manage') && (
                        <Link href="/medical-billing/patient-payments/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Payment
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
                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} payment${total === 1 ? '' : 's'}`}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead><tr><th>Receipt #</th><th>Patient</th><th>Claim</th><th>Date</th><th>Amount</th><th>Method</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading payments..." variant="spinner" /></td></tr>
                                            ) : payments.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No patient payments found.</td></tr>
                                            ) : (
                                                payments.map((p) => (
                                                    <tr key={p.id}>
                                                        <td>
                                                            <button type="button" className="btn btn-link p-0" onClick={() => setOpenPaymentId(p.id)}>
                                                                <FiFileText className="me-1" />{p.receipt_number}
                                                            </button>
                                                        </td>
                                                        <td>{p.patient ? `${p.patient.first_name} ${p.patient.last_name}` : 'N/A'}</td>
                                                        <td>{p.claim?.claim_number || 'N/A'}</td>
                                                        <td>{formatDate(p.payment_date)}</td>
                                                        <td>${Number(p.amount).toFixed(2)}</td>
                                                        <td className="text-capitalize">{p.method || 'N/A'}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_receipts.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
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

            {openPaymentId && (
                <PatientPaymentModal
                    paymentId={openPaymentId}
                    onClose={() => setOpenPaymentId(null)}
                />
            )}
        </PermissionGuard>
    )
}

export default page
