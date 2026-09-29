'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiFileText } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { todayInputDate } from '@/utils/formatDate'

const page = () => {
    const router = useRouter()
    const [bankAccountId, setBankAccountId] = useState('')
    const [depositDate, setDepositDate] = useState(todayInputDate())
    const [depositReference, setDepositReference] = useState('')
    const [notes, setNotes] = useState('')

    const [bankAccounts, setBankAccounts] = useState([])

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const response = await crmInstance.get('/medical-billing/bank-accounts', { params: { per_page: 500 } })
                setBankAccounts((response.data?.data || []).filter(a => a.status === 'active'))
            } catch {
                // dropdown stays empty
            }
        })()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                bank_account_id: bankAccountId,
                deposit_date: depositDate,
                deposit_reference: depositReference || null,
                notes: notes || null,
            }
            const response = await crmInstance.post('/medical-billing/deposits', payload)
            if (response.status === 201) {
                Swal.fire({ title: 'Success!', text: 'Deposit created! Add payments to it next.', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push(`/medical-billing/deposits`))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to create deposit'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_deposits.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiFileText /> New Deposit</h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Bank Account <span className="text-danger">*</span></label>
                                            <select className="form-select" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required disabled={isLoading}>
                                                <option value="">Select bank account</option>
                                                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Deposit Date <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Deposit Reference</label>
                                            <input type="text" className="form-control" value={depositReference} onChange={(e) => setDepositReference(e.target.value)} disabled={isLoading} />
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
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Create Deposit
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
