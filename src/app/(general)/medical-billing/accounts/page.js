'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import AccountModal from '@/components/medicalBilling/AccountModal'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [accountModal, setAccountModal] = useState(null) // { id, mode } | null

    const fetchAccounts = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get('/medical-billing/bank-accounts')
            setAccounts(response.data?.data || [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load bank accounts.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setAccounts([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAccounts() }, [])

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({ title: `Delete "${name}"`, text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/bank-accounts/${id}`)
            setAccounts(prev => prev.filter(a => a.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete account.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_accounts.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_accounts.manage') && (
                        <Link href="/medical-billing/accounts/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Bank Account
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
                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead><tr><th>Account Name</th><th>Bank</th><th>Account #</th><th>Type</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" className="text-center py-4"><Spinner label="Loading accounts..." variant="spinner" /></td></tr>
                                            ) : accounts.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center py-4">No bank accounts found.</td></tr>
                                            ) : (
                                                accounts.map((a) => (
                                                    <tr key={a.id}>
                                                        <td>{a.account_name}</td>
                                                        <td>{a.bank_name}</td>
                                                        <td>{a.account_number_last4 ? `••••${a.account_number_last4}` : 'N/A'}</td>
                                                        <td className="text-capitalize">{a.account_type}</td>
                                                        <td><span className={`badge bg-soft-${a.status === 'active' ? 'success' : 'secondary'} text-${a.status === 'active' ? 'success' : 'secondary'} text-capitalize`}>{a.status}</span></td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_accounts.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setAccountModal({ id: a.id, mode: 'edit' })}><FiEdit3 /></button>
                                                                )}
                                                                {hasPermission('medical_accounts.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(a.id, a.account_name)}><FiTrash2 /></button>
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

            {accountModal && (
                <AccountModal
                    accountId={accountModal.id}
                    initialMode={accountModal.mode}
                    onClose={() => setAccountModal(null)}
                    onSaved={fetchAccounts}
                />
            )}
        </PermissionGuard>
    )
}

export default page
