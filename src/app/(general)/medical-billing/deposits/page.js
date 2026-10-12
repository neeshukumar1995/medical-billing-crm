'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiPlus, FiFileText } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import DepositModal from '@/components/medicalBilling/DepositModal'
import { formatDate } from '@/utils/formatDate'

const STATUS_COLORS = { pending: 'secondary', deposited: 'info', reconciled: 'success' }

const page = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const [deposits, setDeposits] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
    const [openDepositId, setOpenDepositId] = useState(null)

    // Re-sync on client-side navigation to this same route with a different
    // ?status= (e.g. the dashboard's "Pending Deposits" card) — a plain
    // useState initializer only runs once and misses that.
    useEffect(() => {
        setStatusFilter(searchParams.get('status') || '')
    }, [searchParams])

    const fetchDeposits = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter
            const response = await crmInstance.get('/medical-billing/deposits', { params })
            setDeposits(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load deposits.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setDeposits([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchDeposits() }, [statusFilter])

    return (
        <PermissionGuard permission="medical_deposits.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_deposits.manage') && (
                        <Link href="/medical-billing/deposits/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Deposit
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
                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='d-flex justify-content-end'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="pending">Pending</option>
                                                <option value="deposited">Deposited</option>
                                                <option value="reconciled">Reconciled</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} deposit${total === 1 ? '' : 's'}`}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead><tr><th>Deposit Ref</th><th>Bank Account</th><th>Deposit Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" className="text-center py-4"><Spinner label="Loading deposits..." variant="spinner" /></td></tr>
                                            ) : deposits.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center py-4">No deposits found.</td></tr>
                                            ) : (
                                                deposits.map((d) => (
                                                    <tr key={d.id}>
                                                        <td>
                                                            <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => setOpenDepositId(d.id)}>
                                                                <FiFileText className="me-1" />{d.deposit_reference || `Deposit #${d.id}`}
                                                            </button>
                                                        </td>
                                                        <td>{d.bank_account ? `${d.bank_account.account_name} — ${d.bank_account.bank_name}` : 'N/A'}</td>
                                                        <td>{formatDate(d.deposit_date)}</td>
                                                        <td>{d.items_count}</td>
                                                        <td>${Number(d.total_amount).toFixed(2)}</td>
                                                        <td><span className={`badge bg-soft-${STATUS_COLORS[d.status] || 'secondary'} text-${STATUS_COLORS[d.status] || 'secondary'} text-capitalize`}>{d.status}</span></td>
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

            {openDepositId && (
                <DepositModal
                    depositId={openDepositId}
                    onClose={() => setOpenDepositId(null)}
                    onSaved={fetchDeposits}
                />
            )}
        </PermissionGuard>
    )
}

export default page
