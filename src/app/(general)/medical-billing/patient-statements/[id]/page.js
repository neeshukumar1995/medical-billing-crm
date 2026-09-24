'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import { FiDownload } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import { formatDate } from '@/utils/formatDate'

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [data, setData] = useState(null)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        const fetchStatement = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get(`/medical-billing/patient-statements/${actualId}`)
                setData(response.data)
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load patient statement.')
            } finally {
                setIsFetching(false)
            }
        }
        if (actualId) fetchStatement()
    }, [actualId])

    const handleDownloadPdf = async () => {
        setDownloading(true)
        try {
            const response = await crmInstance.get(`/medical-billing/patient-statements/${actualId}/pdf`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `statement-${data?.patient?.patient_number || actualId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch {
            // stays silent — the in-app view already shows the same data
        } finally {
            setDownloading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_ar.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {data && (
                        <button onClick={handleDownloadPdf} className="btn btn-primary" disabled={downloading}>
                            {downloading ? (
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            ) : (
                                <FiDownload className="me-2" />
                            )}
                            Download PDF
                        </button>
                    )}
                </div>
            </PageHeader>

            <div className='main-content'>
                {error && <div className="alert alert-danger">{error}</div>}

                {isFetching ? (
                    <div className="d-flex justify-content-center py-5">
                        <Spinner label="Loading statement..." variant="spinner" />
                    </div>
                ) : !data ? null : (
                    <div className='row g-4'>
                        <div className="col-lg-12">
                            <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                                <div className="card-body">
                                    <h2 className="card-title fw-bold text-dark mb-0">
                                        {data.patient.first_name} {data.patient.last_name}
                                    </h2>
                                    <p className="text-muted mb-0 mt-1">Patient #: {data.patient.patient_number}</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-12">
                            <div className="card">
                                <div className="card-header"><h5 className="mb-0">Claims</h5></div>
                                <div className="card-body">
                                    {data.claims.length === 0 ? (
                                        <p className="text-muted mb-0">No claims on file.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Claim #</th>
                                                        <th>Date</th>
                                                        <th>Payer</th>
                                                        <th>Total Charge</th>
                                                        <th>Paid</th>
                                                        <th>Patient Responsibility</th>
                                                        <th>Balance Due</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.claims.map(claim => (
                                                        <tr key={claim.id}>
                                                            <td>{claim.claim_number}</td>
                                                            <td>{formatDate(claim.created_at)}</td>
                                                            <td>{claim.payer?.name || 'Self-pay'}</td>
                                                            <td>${Number(claim.total_charge).toFixed(2)}</td>
                                                            <td>${Number(claim.total_paid).toFixed(2)}</td>
                                                            <td>${Number(claim.patient_responsibility).toFixed(2)}</td>
                                                            <td>${Number(claim.ar_account?.patient_balance || 0).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-12">
                            <div className="card">
                                <div className="card-header"><h5 className="mb-0">Patient Payments</h5></div>
                                <div className="card-body">
                                    {data.payments.length === 0 ? (
                                        <p className="text-muted mb-0">No payments on file.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Method</th>
                                                        <th>Reference</th>
                                                        <th>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.payments.map(p => (
                                                        <tr key={p.id}>
                                                            <td>{formatDate(p.payment_date)}</td>
                                                            <td>{p.method || 'N/A'}</td>
                                                            <td>{p.reference || p.receipt_number}</td>
                                                            <td>${Number(p.amount).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-12">
                            <div className="card">
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-3">
                                            <div className="text-muted small">Total Charges</div>
                                            <div className="fw-semibold">${data.total_charges.toFixed(2)}</div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="text-muted small">Total Paid</div>
                                            <div className="fw-semibold">${data.total_paid.toFixed(2)}</div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="text-muted small">Adjustments</div>
                                            <div className="fw-semibold">${data.total_adjustments.toFixed(2)}</div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="text-muted small">Balance Due</div>
                                            <div className="fw-bold  text-danger">${data.balance_due.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGuard>
    )
}

export default page
