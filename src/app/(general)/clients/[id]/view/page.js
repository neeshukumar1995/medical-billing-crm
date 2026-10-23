'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiEdit, FiPlus, FiMail, FiPhone, FiMapPin, FiUser, FiUsers, FiActivity, FiFileText, FiUserCheck, FiDownload, FiLink } from 'react-icons/fi'
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

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="d-flex align-items-start gap-2 mb-3">
    <Icon className="text-muted mt-1" size={16} />
    <div>
      <div className="fs-11 text-muted text-uppercase">{label}</div>
      <div className="fw-semibold">{value || 'N/A'}</div>
    </div>
  </div>
)

const CompanyStat = ({ icon: Icon, label, value }) => (
  <div className="col-6">
    <div className="d-flex align-items-center gap-2">
      <Icon className="text-primary" size={14} />
      <span className="text-muted fs-12">{label}</span>
      <span className="fw-bold ms-auto">{value ?? 0}</span>
    </div>
  </div>
)

const CompanyCard = ({ company }) => {
  const router = useRouter()
  const { activeCompanyId, switchCompany } = useUser()
  const href = `/companies/${encryptId(company.id)}/view`
  return (
    <div className="col-xl-4 col-md-6 mb-4">
      <div
        className="card h-100 border shadow-sm"
        role="button"
        style={{ cursor: 'pointer' }}
        onClick={() => router.push(href)}
      >
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            {company.logo ? (
              <img src={`${IMAGE_BASE_URL}/${company.logo}`} alt={company.name} width={44} height={44} className="rounded border object-fit-contain" />
            ) : (
              <div className="avatar-text avatar-lg bg-soft-primary text-primary fw-bold">
                {company.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="flex-grow-1 min-w-0">
              <h6 className="mb-0 text-truncate">{company.name}</h6>
              <div className="fs-12 text-muted text-truncate">{company.title || company.email || '—'}</div>
            </div>
            <span className={`badge ${company.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
              {company.status || 'Active'}
            </span>
          </div>
          <div className="row g-2">
            <CompanyStat icon={FiUserCheck} label="Patients" value={company.patients_count} />
            <CompanyStat icon={FiActivity} label="Providers" value={company.providers_count} />
            <CompanyStat icon={FiFileText} label="Claims" value={company.claims_count} />
            <CompanyStat icon={FiUsers} label="Users" value={company.users_count} />
          </div>
        </div>
        <div className="card-footer bg-transparent d-flex align-items-center justify-content-between">
          <span className="text-primary fs-12 fw-semibold">View full details →</span>
          {company.id === activeCompanyId ? (
            <span className="badge bg-soft-success text-success">Active</span>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={(e) => { e.stopPropagation(); switchCompany(company.id, HOME_PATH) }}
              title="Work in this company"
            >
              Open
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
  { key: 'companies', label: 'Companies', format: num, color: 'primary' },
  { key: 'patients', label: 'Patients', format: num, color: 'primary' },
  { key: 'insurance_payers', label: 'Insurance Payers', format: num, color: 'info' },
  { key: 'claims', label: 'Claims', format: num, color: 'success' },
  { key: 'total_charged', label: 'Total Charged', format: money, color: 'primary' },
  { key: 'insurance_paid', label: 'Insurance Paid', format: money, color: 'success' },
  { key: 'patient_paid', label: 'Patient Paid', format: money, color: 'info' },
  { key: 'ar_balance', label: 'AR Balance', format: money, color: 'danger' },
]

/** Totals across all of the client's companies + one comparison row per company. */
const ClientConsolidated = ({ overview, period, onPeriodChange, onOpenCompany }) => {
  if (!overview) return null
  const { totals, companies } = overview

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="mb-0">All Companies — Consolidated <span className="fs-12 text-muted fw-normal">({periodLabel(period)})</span></h5>
        <PeriodFilter value={period} onChange={onPeriodChange} />
      </div>
      <div className="row">
        {TOTAL_TILES.map(tile => (
          <div key={tile.key} className="col-xl-3 col-md-4 col-6 mb-4">
            <div className={`card h-100 mb-0 border-start border-3 border-${tile.color}`}>
              <div className="card-body py-3">
                {/* Theme's fs-5 is 5px (not Bootstrap's heading size) — use fs-20 */}
                <div className="fs-13 text-muted mb-1">{tile.label}</div>
                <div className={`fs-20 fw-bold text-nowrap text-${tile.color}`}>{tile.format(totals[tile.key])}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {companies.length > 0 && (
        <div className="card mb-4">
          <div className="card-header"><h5 className="card-title mb-0">Company Comparison</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th className="text-end">Patients</th>
                    <th className="text-end">Providers</th>
                    <th className="text-end">Appointments</th>
                    <th className="text-end">Claims</th>
                    <th className="text-end">Denials</th>
                    <th className="text-end">Billed</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">AR Balance</th>
                    <th className="text-end">Users</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(row => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/companies/${encryptId(row.id)}/view`} className="fw-semibold">{row.name}</Link>
                        {row.status !== 'Active' && <span className="badge bg-soft-secondary text-secondary ms-2">{row.status}</span>}
                      </td>
                      <td className="text-end">{num(row.patients)}</td>
                      <td className="text-end">{num(row.providers)}</td>
                      <td className="text-end">{num(row.appointments)}</td>
                      <td className="text-end">{num(row.claims)}</td>
                      <td className="text-end">{num(row.denials)}</td>
                      <td className="text-end">{money(row.total_charged)}</td>
                      <td className="text-end">{money(Number(row.insurance_paid) + Number(row.patient_paid))}</td>
                      <td className="text-end text-danger">{money(row.ar_balance)}</td>
                      <td className="text-end">{num(row.users)}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onOpenCompany(row.id)}
                          title="Switch the portal to this company">
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
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
  // Bumped after any change so the activity list reloads.
  const [refreshKey, setRefreshKey] = useState(0)

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

  return (
    <PermissionGuard permission="view-clients">
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          {client && (
            <button type="button" className="btn btn-light-brand" onClick={handleExport} disabled={exporting}>
              <FiDownload size={16} className='me-2' />
              <span>Export</span>
            </button>
          )}
          {client && isPlatform && hasPermission('edit-companies') && (
            <button type="button" className="btn btn-light-brand" onClick={() => setShowLinkModal(true)}>
              <FiLink size={16} className='me-2' />
              <span>Link Companies</span>
            </button>
          )}
          {client && hasPermission('edit-clients') && (
            <Link href={`/clients/${params.id}/edit`} className="btn btn-outline-primary">
              <FiEdit size={16} className='me-2' />
              <span>Edit Client</span>
            </Link>
          )}
          {client && hasPermission('create-companies') && (
            <Link href={`/companies/create?client_id=${client.id}`} className="btn btn-primary">
              <FiPlus size={16} className='me-2' />
              <span>Add Company</span>
            </Link>
          )}
        </div>
      </PageHeader>
      <div className='main-content'>
        {loading ? (
          <div className="card">
            <div className="card-body text-center py-5">
              <Spinner classNames={{ label: "text-foreground mt-4" }} label="Loading..." variant="spinner" />
            </div>
          </div>
        ) : error || !client ? (
          <div className="alert alert-danger">{error || 'Client not found'}</div>
        ) : (
          <>
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h4 className="mb-1">{client.name}</h4>
                    <span className="text-muted fs-12">Client since {client.created_at ? formatDate(client.created_at) : 'N/A'}</span>
                  </div>
                  <span className={`badge fs-12 ${client.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
                    {client.status}
                  </span>
                </div>
                <div className="row">
                  <div className="col-md-3"><InfoRow icon={FiUser} label="Contact Person" value={client.contact_person} /></div>
                  <div className="col-md-3"><InfoRow icon={FiMail} label="Email" value={client.email} /></div>
                  <div className="col-md-3"><InfoRow icon={FiPhone} label="Phone" value={client.phone} /></div>
                  <div className="col-md-3"><InfoRow icon={FiMapPin} label="Address" value={client.address} /></div>
                </div>
                {client.notes && (
                  <div className="border-top pt-3">
                    <div className="fs-11 text-muted text-uppercase mb-1">Notes</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{client.notes}</div>
                  </div>
                )}
              </div>
            </div>

            <ClientConsolidated
              overview={overview}
              period={period}
              onPeriodChange={setPeriod}
              onOpenCompany={(companyId) => switchCompany(companyId, HOME_PATH)}
            />

            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Companies ({companies.length})</h5>
            </div>

            {companies.length === 0 ? (
              <div className="card">
                <div className="card-body text-center py-5 text-muted">
                  No companies linked to this client yet.
                  {hasPermission('create-companies') && (
                    <div className="mt-3">
                      <Link href={`/companies/create?client_id=${client.id}`} className="btn btn-primary btn-sm">
                        <FiPlus className="me-1" /> Add Company
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="row">
                {companies.map(company => <CompanyCard key={company.id} company={company} />)}
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
