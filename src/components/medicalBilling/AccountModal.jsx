'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiCreditCard, FiX, FiSave } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyForm = {
    account_name: '',
    bank_name: '',
    account_number_last4: '',
    routing_number: '',
    account_type: 'checking',
    status: 'active',
}

const toFormData = (a) => ({
    account_name: a.account_name || '',
    bank_name: a.bank_name || '',
    account_number_last4: a.account_number_last4 || '',
    routing_number: a.routing_number || '',
    account_type: a.account_type || 'checking',
    status: a.status || 'active',
})

export default function AccountModal({ accountId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [account, setAccount] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState(emptyForm)
    const [isSaving, setIsSaving] = useState(false)

    const fetchAccount = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get('/medical-billing/bank-accounts', { params: { per_page: 1000 } })
            const list = response.data?.data || []
            const found = list.find(x => String(x.id) === String(accountId))
            if (!found) throw new Error('Bank account not found')
            setAccount(found)
            setFormData(toFormData(found))
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load account.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (accountId) fetchAccount()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleEditClick = () => {
        if (account) setFormData(toFormData(account))
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (account) setFormData(toFormData(account))
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/bank-accounts/${accountId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Bank account updated!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await fetchAccount()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update account'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiCreditCard />
                                {mode === 'edit' ? 'Edit Bank Account' : 'Bank Account Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading account..." variant="spinner" />
                                </div>
                            ) : !account ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {account.account_name}
                                                <span className={`badge bg-soft-${account.status === 'active' ? 'success' : 'secondary'} text-${account.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                                    {account.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">{account.bank_name}</p>
                                        </div>
                                        {hasPermission('medical_accounts.manage') && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4">
                                        <Field label="Account Name" value={account.account_name} />
                                        <Field label="Bank Name" value={account.bank_name} />
                                        <Field label="Account # (last 4)" value={account.account_number_last4 ? `••••${account.account_number_last4}` : null} />
                                        <Field label="Routing Number" value={account.routing_number} />
                                        <Field label="Type" value={account.account_type} />
                                        <Field label="Status" value={account.status} />
                                    </div>
                                </>
                            ) : (
                                <form id="account-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Account Name <span className="text-danger">*</span></label>
                                            <input type="text" name="account_name" className="form-control" value={formData.account_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Bank Name <span className="text-danger">*</span></label>
                                            <input type="text" name="bank_name" className="form-control" value={formData.bank_name} onChange={handleInputChange} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Account # (last 4)</label>
                                            <input type="text" name="account_number_last4" className="form-control" maxLength={4} value={formData.account_number_last4} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Routing Number</label>
                                            <input type="text" name="routing_number" className="form-control" value={formData.routing_number} onChange={handleInputChange} disabled={isSaving} />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Type</label>
                                            <select name="account_type" className="form-select" value={formData.account_type} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="checking">Checking</option>
                                                <option value="savings">Savings</option>
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isSaving}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="modal-footer">
                            {mode === 'edit' ? (
                                <>
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                                        Cancel
                                    </button>
                                    <button type="submit" form="account-modal-form" className="btn btn-primary" disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="me-2" />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                    <FiX className="me-2" />
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}
