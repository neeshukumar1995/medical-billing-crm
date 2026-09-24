'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiCreditCard } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const page = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({ account_name: '', bank_name: '', account_number_last4: '', routing_number: '', account_type: 'checking', status: 'active' })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            const response = await crmInstance.post('/medical-billing/bank-accounts', formData)
            if (response.status === 201) {
                Swal.fire({ title: 'Success!', text: 'Bank account added!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/accounts'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to add bank account'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_accounts.manage" redirect={false}>
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
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiCreditCard /> Add Bank Account</h2>
                                <p className="text-muted small mb-0">Only the last 4 digits of the account number are stored.</p>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Account Name <span className="text-danger">*</span></label>
                                            <input type="text" name="account_name" className="form-control" value={formData.account_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Bank Name <span className="text-danger">*</span></label>
                                            <input type="text" name="bank_name" className="form-control" value={formData.bank_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Account # (last 4)</label>
                                            <input type="text" name="account_number_last4" className="form-control" maxLength={4} value={formData.account_number_last4} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Routing Number</label>
                                            <input type="text" name="routing_number" className="form-control" value={formData.routing_number} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Account Type</label>
                                            <select name="account_type" className="form-select" value={formData.account_type} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="checking">Checking</option>
                                                <option value="savings">Savings</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="text-center mt-5">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</> : <><FiSave className="me-2" />Add Account</>}
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
