'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import { FiFileText } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [payment, setPayment] = useState(null)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get(`/medical-billing/patient-payments/${actualId}`)
                setPayment(response.data)
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load payment.')
            } finally {
                setIsFetching(false)
            }
        }
        if (actualId) load()
    }, [actualId])

    return (
        <PermissionGuard permission="medical_receipts.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-8 mx-auto">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading receipt..." variant="spinner" /></div>
                                ) : payment && (
                                    <>
                                        <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2 mb-4"><FiFileText /> Receipt {payment.receipt_number}</h2>
                                        <div className="row g-4">
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Patient</label>
                                                <p className="fw-semibold mb-0">{payment.patient ? `${payment.patient.first_name} ${payment.patient.last_name}` : 'N/A'}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Claim</label>
                                                <p className="fw-semibold mb-0">{payment.claim?.claim_number || 'N/A'}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Payment Date</label>
                                                <p className="fw-semibold mb-0">{payment.payment_date}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Amount</label>
                                                <p className="fw-semibold mb-0">${Number(payment.amount).toFixed(2)}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Method</label>
                                                <p className="fw-semibold mb-0 text-capitalize">{payment.method || 'N/A'}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Reference #</label>
                                                <p className="fw-semibold mb-0">{payment.reference || 'N/A'}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted">Recorded By</label>
                                                <p className="fw-semibold mb-0">{payment.created_by?.name || 'N/A'}</p>
                                            </div>
                                            {payment.notes && (
                                                <div className="col-md-12">
                                                    <label className="form-label text-muted">Notes</label>
                                                    <p className="fw-semibold mb-0">{payment.notes}</p>
                                                </div>
                                            )}
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
