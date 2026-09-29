'use client'
import React, { useMemo, useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import ChartWrapper from '@/components/shared/ChartWrapper'
import {
    FiUsers, FiUserCheck, FiActivity, FiAlertCircle,
    FiPackage, FiShoppingCart, FiBriefcase, FiDollarSign, FiAward
} from 'react-icons/fi'

const STATUS_HEX = {
    draft: '#94a3b8', submitted: '#0ea5e9', accepted: '#0d9488', pending: '#f59e0b',
    paid: '#16a34a', denied: '#dc2626', partially_paid: '#f59e0b', closed: '#374151', rejected: '#dc2626',
}
const BUCKET_COLORS = { '0-30': 'success', '31-60': 'warning', '61-90': 'danger', '90+': 'dark' }
const BUCKET_HEX = { '0-30': '#16a34a', '31-60': '#f59e0b', '61-90': '#ef4444', '90+': '#374151' }
const CREDENTIALING_HEX = {
    not_started: '#94a3b8', in_progress: '#0ea5e9', verified: '#16a34a', rejected: '#dc2626', expired: '#374151',
}

const formatLabel = (s) => (s || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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

const ChartCard = ({ title, children }) => (
    <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
            <h6 className="mb-3">{title}</h6>
            {children}
        </div>
    </div>
)

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

    const trends = data?.monthly_trends || []
    const trendMonths = trends.map(m => m.month)

    const claimsStatusChart = useMemo(() => {
        const entries = Object.entries(data?.claims_by_status || {})
        return {
            series: entries.map(([, count]) => count),
            options: {
                chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'inherit' },
                labels: entries.map(([status]) => formatLabel(status)),
                colors: entries.map(([status]) => STATUS_HEX[status] || '#94a3b8'),
                legend: { position: 'bottom' },
                dataLabels: { enabled: true },
            },
        }
    }, [data])

    const arAgingChart = useMemo(() => {
        const buckets = data?.ar_summary?.buckets || []
        return {
            series: [{ name: 'Balance', data: buckets.map(b => b.total) }],
            options: {
                chart: {
                    type: 'bar', toolbar: { show: false }, fontFamily: 'inherit',
                    events: { click: () => router.push('/medical-billing/ar') },
                },
                plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', distributed: true } },
                colors: buckets.map(b => BUCKET_HEX[b.bucket] || '#94a3b8'),
                xaxis: { categories: buckets.map(b => `${b.bucket} days`) },
                legend: { show: false },
                dataLabels: { enabled: true, formatter: (val) => `$${Number(val).toFixed(0)}` },
                tooltip: { y: { formatter: (val) => `$${Number(val).toFixed(2)}` } },
            },
        }
    }, [data, router])

    const credentialingStatusChart = useMemo(() => {
        const entries = Object.entries(data?.credentialing_by_status || {})
        return {
            series: entries.map(([, count]) => count),
            options: {
                chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'inherit' },
                labels: entries.map(([status]) => formatLabel(status)),
                colors: entries.map(([status]) => CREDENTIALING_HEX[status] || '#94a3b8'),
                legend: { position: 'bottom' },
                dataLabels: { enabled: true },
            },
        }
    }, [data])

    const patientsClaimsTrendChart = useMemo(() => ({
        series: [
            { name: 'New Patients', data: trends.map(m => m.new_patients) },
            { name: 'Claims Submitted', data: trends.map(m => m.claims_count) },
        ],
        options: {
            chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
            stroke: { curve: 'smooth', width: 3 },
            colors: ['#2563EB', '#0D9488'],
            markers: { size: 4 },
            xaxis: { categories: trendMonths },
            legend: { position: 'top' },
            dataLabels: { enabled: false },
        },
    }), [trends, trendMonths])

    const revenueTrendChart = useMemo(() => ({
        series: [
            { name: 'Charges Billed', data: trends.map(m => m.charges_billed) },
            { name: 'Collections', data: trends.map(m => m.collections) },
            { name: 'Adjustments', data: trends.map(m => m.adjustments) },
        ],
        options: {
            chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
            colors: ['#2563EB', '#16a34a', '#f59e0b'],
            xaxis: { categories: trendMonths },
            legend: { position: 'top' },
            dataLabels: { enabled: false },
            tooltip: { y: { formatter: (val) => `$${Number(val).toFixed(2)}` } },
        },
    }), [trends, trendMonths])

    const denialsNoShowChart = useMemo(() => ({
        series: [
            { name: 'Denials', data: trends.map(m => m.denials_count) },
            { name: 'Appointment No-Shows', data: trends.map(m => m.appointments_no_show) },
        ],
        options: {
            chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: { bar: { columnWidth: '45%', borderRadius: 3 } },
            colors: ['#ef4444', '#f59e0b'],
            xaxis: { categories: trendMonths },
            legend: { position: 'top' },
            dataLabels: { enabled: false },
        },
    }), [trends, trendMonths])

    return (
        <PermissionGuard permission="medical_billing.dashboard.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
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
                                <ChartCard title="Claims by Status">
                                    <ChartWrapper options={claimsStatusChart.options} series={claimsStatusChart.series} type="donut" height={260} />
                                </ChartCard>
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
                                            <Link href="/medical-billing/denials?bucket=open" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiAlertCircle className="me-2 text-danger" />Open Denials</span>
                                                <strong>{data.open_denials}</strong>
                                            </Link>
                                            <Link href="/medical-billing/inventory?low_stock=1" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiPackage className="me-2 text-warning" />Low-Stock Items</span>
                                                <strong>{data.low_stock_items}</strong>
                                            </Link>
                                            <Link href="/medical-billing/purchase-orders?bucket=pending" className="d-flex justify-content-between text-decoration-none text-dark">
                                                <span><FiShoppingCart className="me-2 text-info" />Pending Purchase Orders</span>
                                                <strong>{data.pending_purchase_orders}</strong>
                                            </Link>
                                            <Link href="/medical-billing/deposits?status=pending" className="d-flex justify-content-between text-decoration-none text-dark">
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
                            <div className="col-lg-7">
                                <ChartCard title="AR Aging">
                                    <ChartWrapper options={arAgingChart.options} series={arAgingChart.series} type="bar" height={260} />
                                </ChartCard>
                            </div>
                            <div className="col-lg-5">
                                <div className="row g-3 h-100">
                                    {data.ar_summary.buckets.map(b => (
                                        <div className="col-6" key={b.bucket}>
                                            <Link href="/medical-billing/ar" className="card border-0 shadow-sm p-3 d-block text-decoration-none h-100">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className={`badge bg-soft-${BUCKET_COLORS[b.bucket]} text-${BUCKET_COLORS[b.bucket]}`}>{b.bucket} days</span>
                                                    <span className="text-muted small">{b.count} accts</span>
                                                </div>
                                                <h5 className="mt-2 mb-0 text-dark">${Number(b.total).toFixed(2)}</h5>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Credentialing overview */}
                        <div className="row g-3 mb-4">
                            <div className="col-lg-4">
                                <ChartCard title={<><FiAward className="me-2" />Credentialing Status</>}>
                                    <ChartWrapper options={credentialingStatusChart.options} series={credentialingStatusChart.series} type="donut" height={260} />
                                </ChartCard>
                            </div>
                            <div className="col-lg-8">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="mb-0">PSV (Verification) Progress</h6>
                                            <Link href="/medical-billing/credentialing/dashboard" className="small text-decoration-none">Full Credentialing Dashboard →</Link>
                                        </div>
                                        {Object.keys(data.credentialing_by_psv_status || {}).length === 0 ? (
                                            <p className="text-muted small mb-0">No credentialing records yet.</p>
                                        ) : (
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.entries(data.credentialing_by_psv_status).map(([status, count]) => (
                                                    <Link
                                                        key={status}
                                                        href="/medical-billing/credentialing"
                                                        className="badge bg-soft-primary text-primary p-2 text-decoration-none"
                                                    >
                                                        {formatLabel(status)}: {count}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trends */}
                        <div className="row g-3 mb-2">
                            <div className="col-lg-12">
                                <h6 className="mb-2">Trends (Last 6 Months)</h6>
                            </div>
                        </div>
                        <div className="row g-3 mb-4">
                            <div className="col-lg-4">
                                <ChartCard title="Patients & Claims Growth">
                                    <ChartWrapper options={patientsClaimsTrendChart.options} series={patientsClaimsTrendChart.series} type="line" height={280} />
                                </ChartCard>
                            </div>
                            <div className="col-lg-4">
                                <ChartCard title="Revenue: Charges vs Collections vs Adjustments">
                                    <ChartWrapper options={revenueTrendChart.options} series={revenueTrendChart.series} type="bar" height={280} />
                                </ChartCard>
                            </div>
                            <div className="col-lg-4">
                                <ChartCard title="Denials & Appointment No-Shows">
                                    <ChartWrapper options={denialsNoShowChart.options} series={denialsNoShowChart.series} type="bar" height={280} />
                                </ChartCard>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </PermissionGuard>
    )
}

export default page
