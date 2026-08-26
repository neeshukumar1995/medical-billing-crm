'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import {
    FiUsers, FiUserCheck, FiActivity, FiFileText, FiAlertCircle,
    FiPackage, FiShoppingCart, FiBriefcase, FiDollarSign, FiClock
} from 'react-icons/fi'

const STATUS_COLORS = {
    draft: 'secondary', submitted: 'info', paid: 'success', denied: 'danger', closed: 'dark',
}
const BUCKET_COLORS = { '0-30': 'success', '31-60': 'warning', '61-90': 'danger', '90+': 'dark' }

const KpiCard = ({ icon, label, value, href, tone = 'primary' }) => {
    const Wrapper = href ? Link : 'div'
    const wrapperProps = href ? { href } : {}
    return (
        <Wrapper {...wrapperProps} className="card border-0 shadow-sm p-3 h-100 text-decoration-none d-block">
            <div className="d-flex align-items-center gap-3">
                <div className={`avatar-text avatar-lg bg-soft-${tone} text-${tone}`}>{icon}</div>
                <div>
                    <div className="text-muted small">{label}</div>
                    <h4 className="mb-0 text-dark">{value}</h4>
                </div>
            </div>
        </Wrapper>
    )
}

const page = () => {
    const router = useRouter()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await crmInstance.get('/medical-billing/dashboard')
                setData(response.data)
                setError('')
            } catch (err) {
                let errorMessage = 'Failed to load dashboard.'
                if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
                else if (err.response?.data?.message) errorMessage = err.response.data.message
                setError(errorMessage)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <PermissionGuard permission="medical_billing.dashboard.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                </div>
            </PageHeader>
            <div className="main-content">
                {error && <div className="alert alert-danger">{error}</div>}
                {loading ? (
                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading dashboard..." variant="spinner" /></div>
                ) : data && (
                    <>
                        {/* Top-line KPIs */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiUsers />} label="Total Patients" value={data.total_patients} href="/medical-billing/patients" tone="primary" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiUserCheck />} label="Total Providers" value={data.total_providers} href="/medical-billing/providers" tone="info" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiActivity />} label="Actions Today" value={data.actions_today} tone="teal" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiDollarSign />} label="Outstanding AR" value={`$${Number(data.ar_summary.grand_total).toFixed(2)}`} href="/medical-billing/ar" tone="danger" />
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            {/* Claims by status */}
                            <div className="col-lg-4">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body">
                                        <h6 className="mb-3">Claims by Status</h6>
                                        {Object.keys(data.claims_by_status || {}).length === 0 ? (
                                            <p className="text-muted small mb-0">No claims yet.</p>
                                        ) : (
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.entries(data.claims_by_status).map(([status, count]) => (
                                                    <Link
                                                        key={status}
                                                        href="/medical-billing/claims"
                                                        className={`badge bg-soft-${STATUS_COLORS[status] || 'secondary'} text-${STATUS_COLORS[status] || 'secondary'} text-capitalize p-2 text-decoration-none`}
                                                    >
                                                        {status.replace('_', ' ')}: {count}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Collections MTD */}
                            <div className="col-lg-4">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body">
                                        <h6 className="mb-3">Collected This Month</h6>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted small">Insurance</span>
                                            <strong>${Number(data.insurance_collected_mtd).toFixed(2)}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span className="text-muted small">Patient (Receipts)</span>
                                            <strong>${Number(data.patient_collected_mtd).toFixed(2)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alerts needing attention */}
                            <div className="col-lg-4">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body">
                                        <h6 className="mb-3">Needs Attention</h6>
                                        <div className="d-flex flex-column gap-2">
                                            <Link href="/medical-billing/denials" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiAlertCircle className="me-2 text-danger" />Open Denials</span>
                                                <strong>{data.open_denials}</strong>
                                            </Link>
                                            <Link href="/medical-billing/inventory" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiPackage className="me-2 text-warning" />Low-Stock Items</span>
                                                <strong>{data.low_stock_items}</strong>
                                            </Link>
                                            <Link href="/medical-billing/purchase-orders" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiShoppingCart className="me-2 text-info" />Pending Purchase Orders</span>
                                                <strong>{data.pending_purchase_orders}</strong>
                                            </Link>
                                            <Link href="/medical-billing/deposits" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiBriefcase className="me-2 text-secondary" />Pending Deposits</span>
                                                <strong>{data.pending_deposits}</strong>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AR aging */}
                        <div className="row g-3 mb-4">
                            <div className="col-lg-12">
                                <h6 className="mb-2">AR Aging</h6>
                            </div>
                            {data.ar_summary.buckets.map(b => (
                                <div className="col-md-3" key={b.bucket}>
                                    <Link href="/medical-billing/ar" className="card border-0 shadow-sm p-3 d-block text-decoration-none">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className={`badge bg-soft-${BUCKET_COLORS[b.bucket]} text-${BUCKET_COLORS[b.bucket]}`}>{b.bucket} days</span>
                                            <span className="text-muted small">{b.count} accts</span>
                                        </div>
                                        <h5 className="mt-2 mb-0 text-dark">${Number(b.total).toFixed(2)}</h5>
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Recent activity */}
                        <div className="row">
                            <div className="col-lg-12">
                                <div className="card border-0 shadow-sm">
                                    <div className="card-body">
                                        <h6 className="mb-3"><FiClock className="me-2" />Recent Activity</h6>
                                        {(data.recent_activity || []).length === 0 ? (
                                            <p className="text-muted small mb-0">No recent activity.</p>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-hover mb-0">
                                                    <thead><tr><th>When</th><th>User</th><th>Module</th><th>Action</th></tr></thead>
                                                    <tbody>
                                                        {data.recent_activity.map(log => (
                                                            <tr key={log.id}>
                                                                <td className="text-muted small">{log.created_at}</td>
                                                                <td>{log.user_name}</td>
                                                                <td className="text-capitalize">{log.module?.replace('medical_', '').replace('_', ' ')}</td>
                                                                <td className="text-capitalize">{log.action}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </PermissionGuard>
    )
}

export default page
