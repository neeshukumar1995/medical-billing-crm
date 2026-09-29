'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiCreditCard, FiPlus, FiTrash2 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyItem = { claim_id: '', billed_amount: '', allowed_amount: '', paid_amount: '', copay: '', coinsurance: '', deductible: '', patient_responsibility: '' }

const page = () => {
    const router = useRouter()
    const [payerId, setPayerId] = useState('')
    const [paymentDate, setPaymentDate] = useState('')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [paymentReference, setPaymentReference] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState([{ ...emptyItem }])

    const [payers, setPayers] = useState([])
    const [claims, setClaims] = useState([])

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const [payerRes, claimsRes] = await Promise.all([
                    crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/claims', { params: { per_page: 500 } }),
                ])
                setPayers(payerRes.data?.data || [])
                setClaims((claimsRes.data?.data || []).filter(c => !['paid', 'closed', 'draft'].includes(c.status)))
            } catch {
                // dropdowns stay empty
            }
        })()
    }, [])

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((it, i) => {
            if (i !== index) return it
            const updated = { ...it, [field]: value }
            if (field === 'claim_id') {
                const claim = claims.find(c => String(c.id) === String(value))
                if (claim) updated.billed_amount = claim.total_charge
            }
            return updated
        }))
    }
    const addItem = () => setItems(prev => [...prev, { ...emptyItem }])
    const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))
    const totalAllocated = items.reduce((sum, it) => sum + Number(it.paid_amount || 0), 0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                payer_id: payerId || null,
                payment_date: paymentDate,
                payment_amount: paymentAmount,
                payment_method: paymentMethod || null,
                payment_reference: paymentReference || null,
                notes: notes || null,
                items: items.map(it => ({
                    claim_id: it.claim_id,
                    billed_amount: it.billed_amount,
                    allowed_amount: it.allowed_amount || null,
                    paid_amount: it.paid_amount,
                    copay: it.copay || 0,
                    coinsurance: it.coinsurance || 0,
                    deductible: it.deductible || 0,
                    patient_responsibility: it.patient_responsibility || 0,
                })),
            }
            const response = await crmInstance.post('/medical-billing/payments', payload)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!', text: 'Payment created (unposted). Post it from the list to apply it to claims.', icon: 'success',
                    confirmButtonText: 'OK', confirmButtonColor: '#007bff'
                }).then(() => router.push('/medical-billing/payments'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to create payment'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_payments.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FiCreditCard /> Post Payment
                                </h2>
                                <p className="text-muted small mb-0">Payment is created as "unposted" — you'll confirm and apply it to claims from the payments list.</p>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-4">
                                            <label className="form-label">Payer</label>
                                            <select className="form-select" value={payerId} onChange={(e) => setPayerId(e.target.value)} disabled={isLoading}>
                                                <option value="">Select payer (optional)</option>
                                                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Payment Date <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Total Amount <span className="text-danger">*</span></label>
                                            <input type="number" step="0.01" min="0" className="form-control" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Method</label>
                                            <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isLoading}>
                                                <option value="">Select</option>
                                                <option value="EFT">EFT</option>
                                                <option value="Check">Check</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Cash">Cash</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Reference #</label>
                                            <input type="text" className="form-control" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Notes</label>
                                            <input type="text" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} />
                                        </div>
                                    </div>

                                    <h5 className="mb-3">Claim Allocations</h5>
                                    {items.map((item, index) => (
                                        <div key={index} className="border rounded p-3 mb-3">
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">Claim <span className="text-danger">*</span></label>
                                                    <select className="form-select" value={item.claim_id} onChange={(e) => updateItem(index, 'claim_id', e.target.value)} required disabled={isLoading}>
                                                        <option value="">Select claim</option>
                                                        {claims.map(c => <option key={c.id} value={c.id}>{c.claim_number} — {c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : ''} (${Number(c.total_charge).toFixed(2)})</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Billed <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" className="form-control" value={item.billed_amount} onChange={(e) => updateItem(index, 'billed_amount', e.target.value)} required disabled={isLoading} />
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Allowed</label>
                                                    <input type="number" step="0.01" className="form-control" value={item.allowed_amount} onChange={(e) => updateItem(index, 'allowed_amount', e.target.value)} disabled={isLoading} />
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Paid <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" className="form-control" value={item.paid_amount} onChange={(e) => updateItem(index, 'paid_amount', e.target.value)} required disabled={isLoading} />
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Copay</label>
                                                    <input type="number" step="0.01" className="form-control" value={item.copay} onChange={(e) => updateItem(index, 'copay', e.target.value)} disabled={isLoading} />
                                                </div>
                                                <div className="col-md-1 d-flex align-items-end">
                                                    {items.length > 1 && (
                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeItem(index)} disabled={isLoading}>
                                                            <FiTrash2 />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Coinsurance</label>
                                                    <input type="number" step="0.01" className="form-control" value={item.coinsurance} onChange={(e) => updateItem(index, 'coinsurance', e.target.value)} disabled={isLoading} />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Deductible</label>
                                                    <input type="number" step="0.01" className="form-control" value={item.deductible} onChange={(e) => updateItem(index, 'deductible', e.target.value)} disabled={isLoading} />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Patient Responsibility</label>
                                                    <input type="number" step="0.01" className="form-control" value={item.patient_responsibility} onChange={(e) => updateItem(index, 'patient_responsibility', e.target.value)} disabled={isLoading} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button type="button" className="btn btn-sm btn-outline-primary mb-4" onClick={addItem} disabled={isLoading}>
                                        <FiPlus className="me-1" /> Add Claim Allocation
                                    </button>

                                    <div className="text-end mb-4">
                                        <strong>Total Allocated: ${totalAllocated.toFixed(2)}</strong>
                                    </div>

                                    <div className="text-center">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Create Payment
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
