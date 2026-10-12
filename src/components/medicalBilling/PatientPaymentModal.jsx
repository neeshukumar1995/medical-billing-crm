'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import { FiFileText, FiX } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { formatDate } from '@/utils/formatDate'

export default function PatientPaymentModal({ paymentId, onClose }) {
    const [payment, setPayment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchPayment = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/patient-payments/${paymentId}`)
            setPayment(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load payment.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (paymentId) fetchPayment()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentId])

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiFileText />
                                {payment ? `Receipt ${payment.receipt_number}` : 'Receipt'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading receipt..." variant="spinner" />
                                </div>
                            ) : payment ? (
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
                                        <p className="fw-semibold mb-0">{formatDate(payment.payment_date)}</p>
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
                            ) : null}
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
