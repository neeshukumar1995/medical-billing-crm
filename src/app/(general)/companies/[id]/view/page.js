'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import {
  FiUserCheck, FiActivity, FiShield, FiFileText, FiCalendar,
  FiClipboard, FiDollarSign, FiAlertTriangle, FiCreditCard, FiAward, FiTruck, FiPackage,
  FiUsers, FiTarget, FiBriefcase, FiDownload
} from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useParams, useRouter } from 'next/navigation'
import { exportToExcel } from '@/utils/exportExcel'
import PeriodFilter, { periodLabel } from '@/components/shared/PeriodFilter'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { useUser } from '@/context/UserContext'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'
import { IMAGE_BASE_URL } from '@/config/api'

// `path` = the module list a card opens (inside this company).
const MEDICAL_STATS = [
  { key: 'patients', label: 'Patients', icon: FiUserCheck, color: 'primary', path: '/medical-billing/patients' },
  { key: 'insurance_payers', label: 'Insurance Payers', icon: FiShield, color: 'info', path: '/medical-billing/insurance/payers' },
  { key: 'patient_insurances', label: 'Insurance Policies', icon: FiClipboard, color: 'info', path: '/medical-billing/patients' },
  { key: 'providers', label: 'Providers', icon: FiActivity, color: 'success', path: '/medical-billing/providers' },
  { key: 'appointments', label: 'Appointments', icon: FiCalendar, color: 'warning', path: '/medical-billing/appointments' },
  { key: 'encounters', label: 'Encounters', icon: FiClipboard, color: 'secondary', path: '/medical-billing/encounters' },
  { key: 'charges', label: 'Charges', icon: FiDollarSign, color: 'primary', path: '/medical-billing/charges' },
  { key: 'claims', label: 'Claims', icon: FiFileText, color: 'success', path: '/medical-billing/claims' },
  { key: 'denials', label: 'Denials', icon: FiAlertTriangle, color: 'danger', path: '/medical-billing/denials' },
  { key: 'payments', label: 'Insurance Payments', icon: FiCreditCard, color: 'success', path: '/medical-billing/payments' },
  { key: 'patient_payments', label: 'Patient Payments', icon: FiCreditCard, color: 'info', path: '/medical-billing/patient-payments' },
  { key: 'credentialing', label: 'Credentialing', icon: FiAward, color: 'warning', path: '/medical-billing/credentialing' },
  { key: 'vendors', label: 'Vendors', icon: FiTruck, color: 'secondary', path: '/medical-billing/vendors' },
  { key: 'inventory_items', label: 'Inventory Items', icon: FiPackage, color: 'secondary', path: '/medical-billing/inventory' },
]

const CRM_STATS = [
  { key: 'users', label: 'Users', icon: FiUsers, color: 'primary', path: '/users/list' },
  { key: 'leads', label: 'Leads', icon: FiTarget, color: 'warning', path: '/leads/list' },
]

const FINANCIALS = [
  { key: 'total_charged', label: 'Total Charged', color: 'primary' },
  { key: 'insurance_paid', label: 'Insurance Paid', color: 'success' },
  { key: 'patient_paid', label: 'Patient Paid', color: 'info' },
  { key: 'ar_balance', label: 'AR Balance', color: 'danger' },
]

const money = (value) => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const humanize = (value) => (value || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const StatCard = ({ icon: Icon, label, value, color, onOpen }) => (
  <div className="col-xxl-2 col-lg-3 col-md-4 col-6 mb-4">
    <div
      className="card h-100 mb-0"
      role="button"
      style={{ cursor: 'pointer' }}
      onClick={onOpen}
      title={`Open ${label} of this company`}
    >
      <div className="card-body d-flex align-items-center gap-3">
        <div className={`avatar-text avatar-lg bg-soft-${color} text-${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <div className="fs-20 fw-bold text-dark">{Number(value || 0).toLocaleString()}</div>
          <div className="fs-12 text-muted">{label}</div>
        </div>
      </div>
    </div>
  </div>
)

const page = () => {
  const params = useParams()
  const { activeCompanyId, switchCompany } = useUser()
  const router = useRouter()
  const actualId = useMemo(() => decryptId(params.id), [params.id])
  const [overview, setOverview] = useState(null)
  const [period, setPeriod] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!actualId) return

    const fetchOverview = async () => {
      try {
        setLoading(true)
        const query = {}
        if (period.from) query.from = period.from
        if (period.to) query.to = period.to
        const response = await crmInstance.get(`/company-overview/${actualId}`, { params: query })
        setOverview(response.data)
        setError('')
      } catch (err) {
        console.error('Failed to fetch company overview:', err)
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load company details.')
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [actualId, period])

  // Module pages always show the ACTIVE company, so switch to this one first.
  const openModule = (path) => {
    if (!overview?.company) return
    if (overview.company.id === activeCompanyId) {
      router.push(path)
    } else {
      switchCompany(overview.company.id, path)
    }
  }

  const handleExport = () => {
    const c = overview?.company
    if (!c) return
    exportToExcel(`Company_${c.name}`, [
      {
        name: 'Company',
        rows: [
          ['Company', c.name], ['Client', c.client?.name], ['Title', c.title], ['Address', c.address],
          ['Status', c.status], ['CRM', c.crm_enabled ? 'On' : 'Off'], ['Medical Billing', c.medical_billing_enabled ? 'On' : 'Off'],
          ['Created', c.created_at ? formatDate(c.created_at) : ''], ['Period', periodLabel(period)],
        ].map(([Field, Value]) => ({ Field, Value: Value ?? '' })),
      },
      {
        name: 'Financials',
        rows: FINANCIALS.map(f => ({ Metric: f.label, Amount: Number(overview.financials?.[f.key] || 0) })),
      },
      {
        name: 'Counts',
        rows: [...MEDICAL_STATS, ...CRM_STATS].map(s => ({ Metric: s.label, Count: Number(overview.counts?.[s.key] || 0) })),
      },
      {
        name: 'Claims by Status',
        rows: Object.entries(overview.claims_by_status || {}).map(([status, n]) => ({ Status: humanize(status), Claims: Number(n) })),
      },
      {
        name: 'Insurance Payers',
        rows: (overview.top_payers || []).map(p => ({ Payer: p.name, Patients: p.patients_count })),
      },
    ])
  }

  const company = overview?.company
  const counts = overview?.counts || {}
  const financials = overview?.financials || {}
  const claimsByStatus = Object.entries(overview?.claims_by_status || {})
  const totalClaims = claimsByStatus.reduce((sum, [, n]) => sum + Number(n), 0)
  const topPayers = overview?.top_payers || []

  return (
    <PermissionGuard permission="view-companies">
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          {company && (
            <button type="button" className="btn btn-light-brand" onClick={handleExport}>
              <FiDownload size={16} className='me-2' />
              <span>Export</span>
            </button>
          )}
        </div>
      </PageHeader>
      <div className='main-content'>
        {loading && !overview ? (
          <div className="card">
            <div className="card-body text-center py-5">
              <Spinner classNames={{ label: "text-foreground mt-4" }} label="Loading..." variant="spinner" />
            </div>
          </div>
        ) : error || !company ? (
          <div className="alert alert-danger">{error || 'Company not found'}</div>
        ) : (
          <>
            {/* Company header */}
            <div className="card mb-4">
              <div className="card-body d-flex flex-wrap align-items-center gap-3">
                {company.logo ? (
                  <img src={`${IMAGE_BASE_URL}/${company.logo}`} alt={company.name} width={56} height={56} className="rounded border object-fit-contain" />
                ) : (
                  <div className="avatar-text avatar-xl bg-soft-primary text-primary fw-bold fs-4">
                    {company.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="flex-grow-1">
                  <h4 className="mb-1">{company.name}</h4>
                  <div className="text-muted fs-12 d-flex flex-wrap gap-3">
                    {company.client && (
                      <span><FiBriefcase className="me-1" />Client: <Link href={`/clients/${encryptId(company.client.id)}/view`}>{company.client.name}</Link></span>
                    )}
                    {company.title && <span>{company.title}</span>}
                    {company.address && <span>{company.address}</span>}
                    <span>Created {company.created_at ? formatDate(company.created_at) : 'N/A'}</span>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <span className={`badge ${company.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
                    {company.status || 'Active'}
                  </span>
                  <span className={`badge ${company.crm_enabled ? 'bg-soft-primary text-primary' : 'bg-soft-secondary text-muted'}`}>
                    CRM {company.crm_enabled ? 'On' : 'Off'}
                  </span>
                  <span className={`badge ${company.medical_billing_enabled ? 'bg-soft-primary text-primary' : 'bg-soft-secondary text-muted'}`}>
                    Medical Billing {company.medical_billing_enabled ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <span className="fs-12 text-muted">
                Showing: <strong>{periodLabel(period)}</strong>{loading && ' — updating…'} · click a card to open that list in this company
              </span>
              <PeriodFilter value={period} onChange={setPeriod} />
            </div>

            {/* Financials */}
            <div className="row">
              {FINANCIALS.map(f => (
                <div key={f.key} className="col-lg-3 col-6 mb-4">
                  <div className={`card h-100 mb-0 border-start border-3 border-${f.color}`}>
                    <div className="card-body">
                      <div className="fs-12 text-muted mb-1">{f.label}</div>
                      <div className={`fs-4 fw-bold text-${f.color}`}>{money(financials[f.key])}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h5 className="mb-3">Medical Billing</h5>
            <div className="row">
              {MEDICAL_STATS.map(s => <StatCard key={s.key} {...s} value={counts[s.key]} onOpen={() => openModule(s.path)} />)}
            </div>

            <h5 className="mb-3">CRM</h5>
            <div className="row">
              {CRM_STATS.map(s => <StatCard key={s.key} {...s} value={counts[s.key]} onOpen={() => openModule(s.path)} />)}
            </div>

            <div className="row">
              {/* Claims by status */}
              <div className="col-lg-6 mb-4">
                <div className="card h-100 mb-0">
                  <div className="card-header"><h5 className="card-title mb-0">Claims by Status</h5></div>
                  <div className="card-body">
                    {claimsByStatus.length === 0 ? (
                      <div className="text-muted text-center py-4">No claims yet.</div>
                    ) : claimsByStatus.map(([status, n]) => {
                      const pct = totalClaims ? Math.round((Number(n) / totalClaims) * 100) : 0
                      return (
                        <div key={status} className="mb-3">
                          <div className="d-flex justify-content-between fs-12 mb-1">
                            <span className="fw-semibold">{humanize(status)}</span>
                            <span className="text-muted">{n} ({pct}%)</span>
                          </div>
                          <div className="progress" style={{ height: 6 }}>
                            <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Top insurance payers */}
              <div className="col-lg-6 mb-4">
                <div className="card h-100 mb-0">
                  <div className="card-header"><h5 className="card-title mb-0">Insurance Payers Used</h5></div>
                  <div className="card-body p-0">
                    {topPayers.length === 0 ? (
                      <div className="text-muted text-center py-4">No patient insurance on file.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead>
                            <tr>
                              <th>Payer</th>
                              <th className="text-end">Patients</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topPayers.map(payer => (
                              <tr key={payer.id}>
                                <td>{payer.name}</td>
                                <td className="text-end fw-semibold">{payer.patients_count}</td>
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
