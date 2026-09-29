'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiBarChart2 } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'

const StatCard = ({ label, value }) => (
    <div className="col-md-2">
        <div className="card border-0 shadow-sm p-3 h-100">
            <div className="text-muted small">{label}</div>
            <h4 className="mt-1 mb-0">{value}</h4>
        </div>
    </div>
)

const page = () => {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [claims, setClaims] = useState(null)
    const [financial, setFinancial] = useState(null)
    const [denials, setDenials] = useState(null)
    const [payers, setPayers] = useState(null)
    const [providers, setProviders] = useState(null)
    const [patientBalances, setPatientBalances] = useState(null)

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                const [claimsRes, financialRes, denialsRes, payersRes, providersRes, pbRes] = await Promise.all([
                    crmInstance.get('/medical-billing/reports/claims'),
                    crmInstance.get('/medical-billing/reports/financial'),
                    crmInstance.get('/medical-billing/reports/denials'),
                    crmInstance.get('/medical-billing/reports/payers'),
                    crmInstance.get('/medical-billing/reports/providers'),
                    crmInstance.get('/medical-billing/reports/patient-balances'),
                ])
                setClaims(claimsRes.data)
                setFinancial(financialRes.data)
                setDenials(denialsRes.data)
                setPayers(payersRes.data)
                setProviders(providersRes.data)
                setPatientBalances(pbRes.data)
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load reports.')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    return (
        <PermissionGuard permission="medical_reports.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        {error && <div className="alert alert-danger">{error}</div>}

                        {loading ? (
                            <div className="d-flex justify-content-center py-5">
                                <Spinner label="Loading reports..." variant="spinner" />
                            </div>
                        ) : (
                            <>
                                {/* Financial summary */}
                                {financial && (
                                    <div className="row g-3 mb-4">
                                        <StatCard label="Total Charges" value={`$${financial.total_charges.toFixed(2)}`} />
                                        <StatCard label="Total Payments" value={`$${financial.total_payments.toFixed(2)}`} />
                                        <StatCard label="Adjustments" value={`$${financial.total_adjustments.toFixed(2)}`} />
                                        <StatCard label="Patient Resp." value={`$${financial.total_patient_responsibility.toFixed(2)}`} />
                                        <StatCard label="AR Outstanding" value={`$${financial.total_ar_outstanding.toFixed(2)}`} />
                                        <StatCard label="Allowed (posted)" value={`$${financial.total_allowed.toFixed(2)}`} />
                                    </div>
                                )}

                                {/* Claims by status */}
                                {claims && (
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-body">
                                            <h5 className="d-flex align-items-center gap-2 mb-3"><FiBarChart2 /> Claims by Status ({claims.total_claims} total)</h5>
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead><tr><th>Status</th><th>Count</th><th>Total Charge</th></tr></thead>
                                                    <tbody>
                                                        {claims.by_status.filter(s => s.count > 0).map(s => (
                                                            <tr key={s.status}>
                                                                <td className="text-capitalize">{s.status.replace('_', ' ')}</td>
                                                                <td>{s.count}</td>
                                                                <td>${s.total_charge.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="row g-4 mb-4">
                                    {/* Denials */}
                                    {denials && (
                                        <div className="col-md-6">
                                            <div className="card border-0 shadow-sm h-100">
                                                <div className="card-body">
                                                    <h5 className="mb-3">Denials — {denials.resolution_rate}% resolved</h5>
                                                    <p className="text-muted small">{denials.resolved} of {denials.total_denials} resolved or written off</p>
                                                    <div className="table-responsive">
                                                        <table className="table table-sm">
                                                            <thead><tr><th>Denial Code</th><th>Count</th></tr></thead>
                                                            <tbody>
                                                                {denials.by_code.map((d, i) => (
                                                                    <tr key={i}><td>{d.denial_code || 'N/A'}</td><td>{d.count}</td></tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Patient balances */}
                                    {patientBalances && (
                                        <div className="col-md-6">
                                            <div className="card border-0 shadow-sm h-100">
                                                <div className="card-body">
                                                    <h5 className="mb-3">Outstanding Patient Balances — ${patientBalances.total_patient_balance.toFixed(2)}</h5>
                                                    <div className="table-responsive">
                                                        <table className="table table-sm">
                                                            <thead><tr><th>Patient</th><th>Balance</th><th>Aging</th></tr></thead>
                                                            <tbody>
                                                                {patientBalances.accounts.slice(0, 10).map(a => (
                                                                    <tr key={a.id}>
                                                                        <td>{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'N/A'}</td>
                                                                        <td>${Number(a.patient_balance).toFixed(2)}</td>
                                                                        <td>{a.aging_bucket}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="row g-4">
                                    {/* By payer */}
                                    {payers && (
                                        <div className="col-md-6">
                                            <div className="card border-0 shadow-sm h-100">
                                                <div className="card-body">
                                                    <h5 className="mb-3">By Payer</h5>
                                                    <div className="table-responsive">
                                                        <table className="table table-sm">
                                                            <thead><tr><th>Payer</th><th>Claims</th><th>Charged</th><th>Paid</th><th>Denials</th></tr></thead>
                                                            <tbody>
                                                                {payers.payers.map((p, i) => (
                                                                    <tr key={i}>
                                                                        <td>{p.payer_name}</td>
                                                                        <td>{p.claim_count}</td>
                                                                        <td>${Number(p.total_charge).toFixed(2)}</td>
                                                                        <td>${Number(p.total_paid).toFixed(2)}</td>
                                                                        <td>{p.denial_count}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* By provider */}
                                    {providers && (
                                        <div className="col-md-6">
                                            <div className="card border-0 shadow-sm h-100">
                                                <div className="card-body">
                                                    <h5 className="mb-3">By Provider</h5>
                                                    <div className="table-responsive">
                                                        <table className="table table-sm">
                                                            <thead><tr><th>Provider</th><th>Claims</th><th>Charged</th><th>Collected</th></tr></thead>
                                                            <tbody>
                                                                {providers.providers.map((p, i) => (
                                                                    <tr key={i}>
                                                                        <td>{p.provider_name}</td>
                                                                        <td>{p.claim_count}</td>
                                                                        <td>${Number(p.total_charge).toFixed(2)}</td>
                                                                        <td>${Number(p.total_collected).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
