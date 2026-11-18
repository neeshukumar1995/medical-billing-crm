'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import {
  FiEdit,
  FiPlus,
  FiMail,
  FiPhone,
  FiMapPin,
  FiUser,
  FiUsers,
  FiActivity,
  FiFileText,
  FiUserCheck,
  FiDownload,
  FiLink,
  FiLayers,
  FiShield,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiBriefcase,
  FiSearch,
  FiX
} from 'react-icons/fi'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { useUser } from '@/context/UserContext'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'
import { IMAGE_BASE_URL } from '@/config/api'
import { exportToExcel } from '@/utils/exportExcel'
import PeriodFilter, { periodLabel } from '@/components/shared/PeriodFilter'
import ClientAdminsSection from '@/components/clients/ClientAdminsSection'
import ClientActivitySection from '@/components/clients/ClientActivitySection'
import LinkCompaniesModal from '@/components/clients/LinkCompaniesModal'
import { HOME_PATH } from '@/constants/portalScope'

const AVATAR_PALETTES = [
  { bg: 'bg-soft-primary', text: 'text-primary' },
  { bg: 'bg-soft-success', text: 'text-success' },
  { bg: 'bg-soft-info', text: 'text-info' },
  { bg: 'bg-soft-warning', text: 'text-warning' },
  { bg: 'bg-soft-danger', text: 'text-danger' },
  { bg: 'bg-soft-secondary', text: 'text-dark' },
]

const getInitials = (name) => {
  if (!name) return 'CL'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getAvatarStyle = (name) => {
  if (!name) return AVATAR_PALETTES[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

const ContactInfoTile = ({ icon: Icon, iconColor = 'text-primary', iconBg = 'bg-soft-primary', label, value, href, onCopy, copied }) => (
  <div className="p-3 bg-light rounded-3 h-100 d-flex align-items-start gap-3 border border-light-subtle">
    <div className={`avatar-text avatar-md ${iconBg} ${iconColor} rounded-3 flex-shrink-0 shadow-none`}>
      <Icon size={16} />
    </div>
    <div className="min-w-0 flex-grow-1">
      <div className="fs-11 fw-semibold text-muted text-uppercase mb-0.5">{label}</div>
      {value ? (
        <div className="d-flex align-items-center gap-1.5">
          {href ? (
            <a href={href} className="fw-bold text-dark text-decoration-none hover-primary text-truncate d-block" title={value}>
              {value}
            </a>
          ) : (
            <span className="fw-bold text-dark text-truncate d-block" title={value}>
              {value}
            </span>
          )}
          {onCopy && (
            <button
              type="button"
              className="btn btn-link p-0 text-muted opacity-50 hover-opacity-100 flex-shrink-0"
              onClick={onCopy}
              title={`Copy ${label.toLowerCase()}`}
            >
              {copied ? <FiCheck size={12} className="text-success" /> : <FiCopy size={12} />}
            </button>
          )}
        </div>
      ) : (
        <span className="text-muted fs-13 fst-italic">Not specified</span>
      )}
    </div>
  </div>
)

const CompanyStat = ({ icon: Icon, label, value, color = 'primary' }) => (
  <div className="col-6">
    <div className="p-2 px-2.5 bg-light rounded-3 d-flex align-items-center gap-2 border border-light-subtle">
      <Icon className={`text-${color} flex-shrink-0`} size={14} />
      <span className="text-muted fs-12 text-truncate">{label}</span>
      <span className="fw-bold text-dark ms-auto fs-13">{value ?? 0}</span>
    </div>
  </div>
)

const CompanyCard = ({ company }) => {
  const router = useRouter()
  const { activeCompanyId, switchCompany } = useUser()
  const href = `/companies/${encryptId(company.id)}/view`
  const palette = getAvatarStyle(company.name)
  const isActive = company.status === 'Active' || !company.status

  return (
    <div className="col-xl-4 col-md-6 mb-4">
      <div
        className="card h-100 border shadow-sm rounded-4 hover-shadow transition-all overflow-hidden"
        role="button"
        style={{ cursor: 'pointer' }}
        onClick={() => router.push(href)}
      >
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            {company.logo ? (
              <img
                src={`${IMAGE_BASE_URL}/${company.logo}`}
                alt={company.name}
                width={48}
                height={48}
                className="rounded-3 border object-fit-contain flex-shrink-0 bg-white p-1"
              />
            ) : (
              <div className={`avatar-text avatar-lg ${palette.bg} ${palette.text} fw-bold rounded-3 flex-shrink-0 shadow-none`}>
                {getInitials(company.name)}
              </div>
            )}
            <div className="flex-grow-1 min-w-0">
              <h6 className="mb-0.5 fw-bold text-dark" title={company.name}>
                {company.name}
              </h6>
              <div className="fs-12 text-muted">
                {company.title || company.email || 'Medical Billing Practice'}
              </div>
            </div>
            <span
              className={`badge rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 ${
                isActive ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'
              }`}
            >
              <span
                className={`rounded-circle ${isActive ? 'bg-success' : 'bg-secondary'}`}
                style={{ width: 6, height: 6 }}
              />
              {company.status || 'Active'}
            </span>
          </div>

          <div className="row g-2 pt-1">
            <CompanyStat icon={FiUserCheck} label="Patients" value={company.patients_count} color="primary" />
            <CompanyStat icon={FiActivity} label="Providers" value={company.providers_count} color="info" />
            <CompanyStat icon={FiFileText} label="Claims" value={company.claims_count} color="success" />
            <CompanyStat icon={FiUsers} label="Users" value={company.users_count} color="warning" />
          </div>
        </div>

        <div className="card-footer bg-light-subtle border-top px-4 py-2.5 d-flex align-items-center justify-content-between">
          <span className="text-primary fs-12 fw-semibold d-inline-flex align-items-center gap-1">
            View full details <FiExternalLink size={12} />
          </span>
          {company.id === activeCompanyId ? (
            <span className="badge bg-soft-success text-success rounded-pill px-3 py-1">
              Current Active
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-semibold"
              onClick={(e) => {
                e.stopPropagation()
                switchCompany(company.id, HOME_PATH)
              }}
              title="Work in this company"
            >
              Open Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const money = (value) => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const num = (value) => Number(value || 0).toLocaleString()

const TOTAL_TILES = [
  { key: 'companies', label: 'Companies', format: num, color: 'primary', icon: FiLayers, bg: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' },
  { key: 'patients', label: 'Patients', format: num, color: 'primary', icon: FiUserCheck, bg: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' },
  { key: 'insurance_payers', label: 'Insurance Payers', format: num, color: 'info', icon: FiShield, bg: 'linear-gradient(135deg, #ffffff 0%, #f6fcff 100%)' },
  { key: 'claims', label: 'Claims', format: num, color: 'success', icon: FiFileText, bg: 'linear-gradient(135deg, #ffffff 0%, #f6fcf8 100%)' },
  { key: 'total_charged', label: 'Total Charged', format: money, color: 'primary', icon: FiDollarSign, bg: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' },
  { key: 'insurance_paid', label: 'Insurance Paid', format: money, color: 'success', icon: FiTrendingUp, bg: 'linear-gradient(135deg, #ffffff 0%, #f6fcf8 100%)' },
  { key: 'patient_paid', label: 'Patient Paid', format: money, color: 'info', icon: FiCreditCard, bg: 'linear-gradient(135deg, #ffffff 0%, #f6fcff 100%)' },
  { key: 'ar_balance', label: 'AR Balance', format: money, color: 'danger', icon: FiAlertCircle, bg: 'linear-gradient(135deg, #ffffff 0%, #fff8f8 100%)' },
]

/** Totals across all of the client's companies + one comparison row per company. */
const ClientConsolidated = ({ overview, period, onPeriodChange, onOpenCompany }) => {
  if (!overview) return null
  const { totals, companies } = overview

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <FiActivity className="text-primary" />
            All Companies — Consolidated
            <span className="badge bg-soft-primary text-primary fs-11 fw-semibold rounded-pill px-2.5 py-1">
              {periodLabel(period)}
            </span>
          </h5>
          <span className="fs-12 text-muted">Aggregated financial &amp; operational performance across all linked practices</span>
        </div>
        <PeriodFilter value={period} onChange={onPeriodChange} />
      </div>

      <div className="row g-3 mb-4">
        {TOTAL_TILES.map(tile => {
          const TileIcon = tile.icon
          return (
            <div key={tile.key} className="col-xl-3 col-md-4 col-sm-6">
              <div
                className={`card h-100 mb-0 border-0 shadow-sm rounded-4 border-start border-3 border-${tile.color}`}
                style={{ background: tile.bg }}
              >
                <div className="card-body p-3 p-md-3.5">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fs-12 fw-semibold text-muted text-uppercase">{tile.label}</span>
                    <div className={`avatar-text avatar-sm bg-soft-${tile.color} text-${tile.color} rounded-3 shadow-none`}>
                      <TileIcon size={15} />
                    </div>
                  </div>
                  <div className={`fs-20 fw-bold text-nowrap text-${tile.color}`}>
                    {tile.format(totals[tile.key])}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {companies.length > 0 && (
        <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h5 className="card-title mb-0 fw-bold text-dark">Company Comparison</h5>
              <span className="fs-12 text-muted">Practice-by-practice billing, collections, and volume breakdown</span>
            </div>
            <span className="badge bg-soft-primary text-primary rounded-pill px-3 py-1">
              {companies.length} {companies.length === 1 ? 'Practice' : 'Practices'}
            </span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light-subtle fs-12 text-uppercase text-muted border-bottom">
                  <tr>
                    <th className="py-3 ps-4">Company</th>
                    <th className="py-3 text-end">Patients</th>
                    <th className="py-3 text-end">Providers</th>
                    <th className="py-3 text-end">Appointments</th>
                    <th className="py-3 text-end">Claims</th>
                    <th className="py-3 text-end">Denials</th>
                    <th className="py-3 text-end">Billed</th>
                    <th className="py-3 text-end">Paid</th>
                    <th className="py-3 text-end">AR Balance</th>
                    <th className="py-3 text-end">Users</th>
                    <th className="py-3 text-end pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(row => {
                    const palette = getAvatarStyle(row.name)
                    const paidAmount = Number(row.insurance_paid || 0) + Number(row.patient_paid || 0)
                    return (
                      <tr key={row.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2.5">
                            <div className={`avatar-text avatar-sm ${palette.bg} ${palette.text} fw-bold rounded-circle flex-shrink-0 shadow-none`}>
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <Link
                                href={`/companies/${encryptId(row.id)}/view`}
                                className="fw-bold text-dark text-decoration-none hover-primary"
                              >
                                {row.name}
                              </Link>
                              {row.status && row.status !== 'Active' && (
                                <span className="badge bg-soft-secondary text-secondary ms-2 fs-10">
                                  {row.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-end fw-semibold">{num(row.patients)}</td>
                        <td className="text-end">{num(row.providers)}</td>
                        <td className="text-end">{num(row.appointments)}</td>
                        <td className="text-end fw-semibold">{num(row.claims)}</td>
                        <td className="text-end">
                          {Number(row.denials) > 0 ? (
                            <span className="text-warning fw-semibold">{num(row.denials)}</span>
                          ) : (
                            num(row.denials)
                          )}
                        </td>
                        <td className="text-end fw-semibold text-dark">{money(row.total_charged)}</td>
                        <td className="text-end fw-semibold text-success">{money(paidAmount)}</td>
                        <td className="text-end fw-bold text-danger">{money(row.ar_balance)}</td>
                        <td className="text-end">{num(row.users)}</td>
                        <td className="text-end pe-4">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary rounded-pill px-3"
                            onClick={() => onOpenCompany(row.id)}
                            title="Switch the portal to this company"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const page = () => {
  const params = useParams()
  const { hasPermission } = usePermissions()
  const { switchCompany, isPlatform, setSelectedClientKey } = useUser()
  const actualId = useMemo(() => decryptId(params.id), [params.id])
  const [client, setClient] = useState(null)
  const [overview, setOverview] = useState(null)
  const [admins, setAdmins] = useState([])
  const [period, setPeriod] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [copiedField, setCopiedField] = useState('')
  // Bumped after any change so the activity list reloads.
  const [refreshKey, setRefreshKey] = useState(0)

  const copyValue = (text, field) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 2000)
  }

  const fetchClient = useCallback(async () => {
    if (!actualId) return
    try {
      setLoading(true)
      const [response, adminsResponse] = await Promise.all([
        crmInstance.get(`/clients/${actualId}`),
        crmInstance.get(`/clients/${actualId}/admins`).catch(() => ({ data: [] })),
      ])
      setClient(response.data)
      // Opening a client (e.g. from the sidebar's Clients list) selects it in
      // the header too, so its companies show up in the company switcher.
      setSelectedClientKey(String(response.data.id))
      setAdmins(Array.isArray(adminsResponse.data) ? adminsResponse.data : [])
      setError('')
    } catch (err) {
      console.error('Failed to fetch client:', err)
      setError('Failed to load client details.')
    } finally {
      setLoading(false)
    }
  }, [actualId, setSelectedClientKey])

  const fetchOverview = useCallback(async () => {
    if (!actualId) return
    const query = {}
    if (period.from) query.from = period.from
    if (period.to) query.to = period.to
    try {
      const { data } = await crmInstance.get(`/clients/${actualId}/overview`, { params: query })
      setOverview(data)
    } catch {
      setOverview(null)
    }
  }, [actualId, period])

  useEffect(() => { fetchClient() }, [fetchClient])
  useEffect(() => { fetchOverview() }, [fetchOverview])

  const refreshAll = () => {
    fetchClient()
    fetchOverview()
    setRefreshKey(k => k + 1)
  }

  // One workbook with everything about this client for the chosen period.
  const handleExport = () => {
    if (!client) return
    setExporting(true)
    try {
      const details = new Map((client.companies || []).map(c => [c.id, c]))
      const totals = overview?.totals || {}
      exportToExcel(`Client_${client.name}`, [
        {
          name: 'Client',
          rows: [
            ['Client Name', client.name], ['Contact Person', client.contact_person], ['Email', client.email],
            ['Phone', client.phone], ['Address', client.address], ['Status', client.status],
            ['Notes', client.notes], ['Created', client.created_at ? formatDate(client.created_at) : ''],
            ['Period', periodLabel(period)],
          ].map(([Field, Value]) => ({ Field, Value: Value ?? '' })),
        },
        {
          name: 'Summary',
          rows: TOTAL_TILES.map(t => ({ Metric: t.label, Value: Number(totals[t.key] || 0) })),
        },
        {
          name: 'Companies',
          rows: (overview?.companies || []).map(row => {
            const info = details.get(row.id) || {}
            return {
              'Company': row.name,
              'Status': row.status,
              'Title': info.title || '',
              'Email': info.email || '',
              'Phone': info.phone || '',
              'Patients': row.patients,
              'Providers': row.providers,
              'Appointments': row.appointments,
              'Claims': row.claims,
              'Denials': row.denials,
              'Total Charged': row.total_charged,
              'Insurance Paid': row.insurance_paid,
              'Patient Paid': row.patient_paid,
              'AR Balance': row.ar_balance,
              'Users': row.users,
            }
          }),
        },
        {
          name: 'Client Admins',
          rows: admins.map(a => ({
            'Name': a.name, 'Username': a.username || '', 'Email': a.email || '',
            'Home Company': a.company?.name || '', 'Role': a.user_role?.name || '', 'Status': a.status || '',
          })),
        },
      ])
    } finally {
      setExporting(false)
    }
  }

  const companies = client?.companies || []
  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies
    const q = companySearch.toLowerCase()
    return companies.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [companies, companySearch])

  const clientPalette = getAvatarStyle(client?.name)

  return (
    <PermissionGuard permission="view-clients">
      <PageHeader>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 w-100">
          <div className="d-flex align-items-center gap-2">
            <Link
              href="/clients/list"
              className="btn btn-sm btn-light rounded-circle d-inline-flex align-items-center justify-content-center border"
              style={{ width: 34, height: 34 }}
              title="Back to Clients Directory"
            >
              <FiArrowLeft size={16} />
            </Link>
            <div>
              <h4 className="mb-0 fw-bold text-dark">
                {client?.name || 'Client Overview'}
              </h4>
              <span className="fs-12 text-muted">
                Client profile, consolidated billing metrics &amp; associated practices
              </span>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2 page-header-right-items-wrapper">
            {client && (
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm"
                onClick={handleExport}
                disabled={exporting}
              >
                <FiDownload size={15} />
                <span>{exporting ? 'Exporting...' : 'Export'}</span>
              </button>
            )}
            {client && isPlatform && hasPermission('edit-companies') && (
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm"
                onClick={() => setShowLinkModal(true)}
              >
                <FiLink size={15} />
                <span>Link Companies</span>
              </button>
            )}
            {client && hasPermission('edit-clients') && (
              <Link
                href={`/clients/${params.id}/edit`}
                className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
              >
                <FiEdit size={15} />
                <span>Edit Client</span>
              </Link>
            )}
            {client && hasPermission('create-companies') && (
              <Link
                href={`/companies/create?client_id=${client.id}`}
                className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
              >
                <FiPlus size={16} />
                <span>Add Company</span>
              </Link>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="main-content">
        {loading ? (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body text-center py-5">
              <Spinner classNames={{ label: 'text-foreground mt-4' }} label="Loading client profile..." variant="spinner" />
            </div>
          </div>
        ) : error || !client ? (
          <div className="alert alert-danger rounded-4 shadow-sm">{error || 'Client not found'}</div>
        ) : (
          <>
            {/* Client Executive Profile Card */}
            <div
              className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f9fbff 100%)' }}
            >
              <div className="card-body p-4">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4 pb-3 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className={`avatar-text avatar-xl ${clientPalette.bg} ${clientPalette.text} fw-bold rounded-4 shadow-none flex-shrink-0`}
                      style={{ fontSize: '1.35rem' }}
                    >
                      {getInitials(client.name)}
                    </div>
                    <div>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <h3 className="mb-0 fw-bold text-dark">{client.name}</h3>
                        <span
                          className={`badge rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1.5 fs-12 ${
                            client.status === 'Active'
                              ? 'bg-soft-success text-success'
                              : 'bg-soft-secondary text-secondary'
                          }`}
                        >
                          <span
                            className={`rounded-circle ${client.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}
                            style={{ width: 7, height: 7 }}
                          />
                          {client.status || 'Active'}
                        </span>
                      </div>

                      <div className="d-flex flex-wrap align-items-center gap-3 text-muted fs-12">
                        <span className="d-inline-flex align-items-center gap-1">
                          <FiCalendar size={13} />
                          Client since {client.created_at ? formatDate(client.created_at) : 'N/A'}
                        </span>
                        <span>&middot;</span>
                        <span className="d-inline-flex align-items-center gap-1">
                          <FiLayers size={13} className="text-primary" />
                          <strong className="text-dark">{companies.length}</strong> Linked {companies.length === 1 ? 'Company' : 'Companies'}
                        </span>
                        <span>&middot;</span>
                        <span className="d-inline-flex align-items-center gap-1">
                          <FiShield size={13} className="text-info" />
                          <strong className="text-dark">{admins.length}</strong> Client {admins.length === 1 ? 'Admin' : 'Admins'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info Grid */}
                <div className="row g-3">
                  <div className="col-xl-3 col-sm-6">
                    <ContactInfoTile
                      icon={FiUser}
                      iconColor="text-primary"
                      iconBg="bg-soft-primary"
                      label="Contact Person"
                      value={client.contact_person}
                    />
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <ContactInfoTile
                      icon={FiMail}
                      iconColor="text-info"
                      iconBg="bg-soft-info"
                      label="Official Email"
                      value={client.email}
                      href={client.email ? `mailto:${client.email}` : undefined}
                      onCopy={client.email ? () => copyValue(client.email, 'email') : undefined}
                      copied={copiedField === 'email'}
                    />
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <ContactInfoTile
                      icon={FiPhone}
                      iconColor="text-success"
                      iconBg="bg-soft-success"
                      label="Phone Number"
                      value={client.phone}
                      href={client.phone ? `tel:${client.phone}` : undefined}
                      onCopy={client.phone ? () => copyValue(client.phone, 'phone') : undefined}
                      copied={copiedField === 'phone'}
                    />
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <ContactInfoTile
                      icon={FiMapPin}
                      iconColor="text-warning"
                      iconBg="bg-soft-warning"
                      label="Address"
                      value={client.address}
                    />
                  </div>
                </div>

                {client.notes && (
                  <div className="mt-3 p-3 bg-light rounded-3 border border-light-subtle">
                    <div className="fs-11 fw-semibold text-muted text-uppercase mb-1">Client Notes &amp; Instructions</div>
                    <div className="text-dark fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                      {client.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Consolidated Executive Overview */}
            <ClientConsolidated
              overview={overview}
              period={period}
              onPeriodChange={setPeriod}
              onOpenCompany={(companyId) => switchCompany(companyId, HOME_PATH)}
            />

            {/* Linked Companies Cards Section */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div>
                <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <FiBriefcase className="text-primary" />
                  Companies ({companies.length})
                </h5>
                <span className="fs-12 text-muted">Click any company card to open its full dashboard</span>
              </div>

              {companies.length > 3 && (
                <div className="position-relative" style={{ minWidth: 260 }}>
                  <FiSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={14} />
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-pill ps-5 pe-4"
                    placeholder="Filter companies..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                  />
                  {companySearch && (
                    <button
                      type="button"
                      className="btn btn-link text-muted position-absolute top-50 end-0 translate-middle-y me-2 p-0"
                      onClick={() => setCompanySearch('')}
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {companies.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body text-center py-5">
                  <div className="avatar-text avatar-lg bg-soft-primary text-primary mx-auto mb-3 rounded-circle">
                    <FiLayers size={22} />
                  </div>
                  <h6 className="fw-bold mb-1">No companies linked to this client yet</h6>
                  <p className="text-muted fs-13 mb-3">
                    Create a new company or link existing companies to start tracking billing under this client.
                  </p>
                  {hasPermission('create-companies') && (
                    <Link href={`/companies/create?client_id=${client.id}`} className="btn btn-primary btn-sm rounded-pill px-3">
                      <FiPlus className="me-1" /> Add Company
                    </Link>
                  )}
                </div>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body text-center py-4 text-muted">
                  No companies matching &ldquo;{companySearch}&rdquo;.
                </div>
              </div>
            ) : (
              <div className="row">
                {filteredCompanies.map(company => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            )}

            <ClientAdminsSection
              clientId={client.id}
              companies={companies}
              admins={admins}
              canAdd={hasPermission('create-users')}
              onChanged={refreshAll}
            />

            <ClientActivitySection clientId={client.id} refreshKey={refreshKey} />
          </>
        )}
      </div>

      {showLinkModal && client && (
        <LinkCompaniesModal
          client={client}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => {
            setShowLinkModal(false)
            refreshAll()
          }}
        />
      )}
    </PermissionGuard>
  )
}

export default page
