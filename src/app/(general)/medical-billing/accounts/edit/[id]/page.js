'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiEdit3 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [formData, setFormData] = useState({ account_name: '', bank_name: '', account_number_last4: '', routing_number: '', account_type: 'checking', status: 'active' })
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get('/medical-billing/bank-accounts', { params: { per_page: 1000 } })
                const list = response.data?.data || []
                const a = list.find(x => String(x.id) === String(actualId))
                if (!a) throw new Error('Bank account not found')
                setFormData({ account_name: a.account_name || '', bank_name: a.bank_name || '', account_number_last4: a.account_number_last4 || '', routing_number: a.routing_number || '', account_type: a.account_type || 'checking', status: a.status || 'active' })
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to load account.')
            } finally {
                setIsFetching(false)
            }
        }
        if (actualId) load()
    }, [actualId])

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            const response = await crmInstance.put(`/medical-billing/bank-accounts/${actualId}`, formData)
            if (response.status === 200) {
                Swal.fire({ title: 'Success!', text: 'Bank account updated!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/accounts'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update account'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_accounts.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiEdit3 /> Edit Bank Account</h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}
                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading account..." variant="spinner" /></div>
                                ) : (
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
                                            <div className="col-md-2">
                                                <label className="form-label">Type</label>
                                                <select name="account_type" className="form-select" value={formData.account_type} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="checking">Checking</option>
                                                    <option value="savings">Savings</option>
                                                </select>
                                            </div>
                                            <div className="col-md-2">
                                                <label className="form-label">Status</label>
                                                <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="text-center mt-5 d-flex gap-3 justify-content-center">
                                            <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                                {isLoading ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</> : <><FiSave className="me-2" />Update</>}
                                            </button>
                                            <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/accounts')} disabled={isLoading}>Cancel</button>
                                        </div>
                                    </form>
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
