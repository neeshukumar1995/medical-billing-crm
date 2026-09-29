'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import {
    FiUsers, FiUserCheck, FiClock, FiSend, FiCheckCircle, FiXCircle,
    FiFile, FiAlertTriangle, FiCalendar, FiAlertOctagon,
} from 'react-icons/fi'
import { providerTypeLabel } from '@/constants/providerOptions'

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
                const response = await crmInstance.get('/medical-billing/credentialing/dashboard')
                setData(response.data)
                setError('')
            } catch (err) {
                let errorMessage = 'Failed to load credentialing dashboard.'
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
        <PermissionGuard permission="medical_credentialing.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link href="/medical-billing/credentialing/followups" className="btn btn-outline-primary">Follow-ups</Link>
                    <Link href="/medical-billing/credentialing" className="btn btn-primary">Credentialing Records</Link>
                </div>
            </PageHeader>
            <div className="main-content">
                {error && <div className="alert alert-danger">{error}</div>}
                {loading ? (
                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading dashboard..." variant="spinner" /></div>
                ) : data && (
                    <>
                        <div className="row g-3 mb-4">
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiUsers />} label="Total Providers/Organizations" value={data.total_providers} href="/medical-billing/providers" tone="primary" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiUserCheck />} label="Applications In Progress" value={data.applications_in_progress} href="/medical-billing/credentialing?status=in_progress" tone="warning" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiAlertOctagon />} label="Overdue Follow-ups" value={data.overdue_followups} href="/medical-billing/credentialing/followups?bucket=overdue" tone="danger" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiCalendar />} label="Pending Follow-ups" value={data.pending_followups} href="/medical-billing/credentialing/followups?bucket=due_soon" tone="teal" />
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiSend />} label="Submitted Applications" value={data.submitted} href="/medical-billing/credentialing?enrollment_status=submitted" tone="info" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiClock />} label="Pending Enrollments" value={data.pending_enrollments} href="/medical-billing/credentialing?enrollment_status=pending" tone="secondary" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiCheckCircle />} label="Approved/Completed" value={data.approved_completed} href="/medical-billing/credentialing?enrollment_status=approved" tone="success" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiXCircle />} label="Denied/Rejected" value={data.denied_rejected} href="/medical-billing/credentialing?enrollment_status=rejected" tone="dark" />
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiFile />} label="Expiring Documents" value={data.expiring_documents} href="/medical-billing/credentialing?document_status=pending" tone="warning" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiAlertTriangle />} label="Expired Documents" value={data.expired_documents} tone="danger" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiFile />} label="Expiring Insurance" value={data.expiring_insurance} href="/medical-billing/credentialing" tone="warning" />
                            </div>
                            <div className="col-md-3 col-sm-6">
                                <KpiCard icon={<FiAlertTriangle />} label="Expired Insurance" value={data.expired_insurance} href="/medical-billing/credentialing" tone="danger" />
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-lg-12">
                                <div className="card border-0 shadow-sm">
                                    <div className="card-body">
                                        <h6 className="mb-3">Providers by Type</h6>
                                        {Object.keys(data.by_provider_type || {}).length === 0 ? (
                                            <p className="text-muted small mb-0">No providers yet.</p>
                                        ) : (
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.entries(data.by_provider_type || {}).map(([type, count]) => (
                                                    type ? (
                                                        <Link
                                                            key={type}
                                                            href={`/medical-billing/credentialing?provider_type=${type}`}
                                                            className="badge bg-soft-primary text-primary text-decoration-none p-2"
                                                        >
                                                            {providerTypeLabel(type)}: {count}
                                                        </Link>
                                                    ) : (
                                                        <span
                                                            key="unspecified"
                                                            className="badge bg-soft-secondary text-secondary p-2"
                                                            title="Providers created before Provider Type was required"
                                                        >
                                                            Unspecified: {count}
                                                        </span>
                                                    )
                                                ))}
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
