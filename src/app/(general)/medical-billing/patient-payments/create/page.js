'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiFileText } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const page = () => {
    const router = useRouter()
    const [patientId, setPatientId] = useState('')
    const [claimId, setClaimId] = useState('')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('')
    const [reference, setReference] = useState('')
    const [notes, setNotes] = useState('')

    const [patients, setPatients] = useState([])
    const [claims, setClaims] = useState([])

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const [patientRes, claimsRes] = await Promise.all([
                    crmInstance.get('/medical-billing/patients', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/claims', { params: { per_page: 500 } }),
                ])
                setPatients(patientRes.data?.data || [])
                setClaims(claimsRes.data?.data || [])
            } catch {
                // dropdowns stay empty
            }
        })()
    }, [])

    const patientClaims = claims.filter(c => !patientId || String(c.patient_id) === String(patientId))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                patient_id: patientId,
                claim_id: claimId || null,
                payment_date: paymentDate,
                amount,
                method: method || null,
                reference: reference || null,
                notes: notes || null,
            }
            const response = await crmInstance.post('/medical-billing/patient-payments', payload)
            if (response.status === 201) {
                Swal.fire({ title: 'Success!', text: 'Payment recorded!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/patient-payments'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to record payment'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_receipts.manage" redirect={false}>
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
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiFileText /> New Patient Payment</h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Patient <span className="text-danger">*</span></label>
                                            <select className="form-select" value={patientId} onChange={(e) => { setPatientId(e.target.value); setClaimId('') }} required disabled={isLoading}>
                                                <option value="">Select patient</option>
                                                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Claim (optional)</label>
                                            <select className="form-select" value={claimId} onChange={(e) => setClaimId(e.target.value)} disabled={isLoading}>
                                                <option value="">None</option>
                                                {patientClaims.map(c => <option key={c.id} value={c.id}>{c.claim_number}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Payment Date <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Amount <span className="text-danger">*</span></label>
                                            <input type="number" step="0.01" min="0.01" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Method</label>
                                            <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)} disabled={isLoading}>
                                                <option value="">Select</option>
                                                <option value="cash">Cash</option>
                                                <option value="check">Check</option>
                                                <option value="credit_card">Credit Card</option>
                                                <option value="debit_card">Debit Card</option>
                                                <option value="ach">ACH</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Reference #</label>
                                            <input type="text" className="form-control" value={reference} onChange={(e) => setReference(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Notes</label>
                                            <input type="text" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} />
                                        </div>
                                    </div>

                                    <div className="text-center mt-5">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Record Payment
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
