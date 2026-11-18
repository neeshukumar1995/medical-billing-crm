'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiEdit3, FiEye, FiTrash2, FiPlus, FiUpload, FiDownload, FiUserCheck, FiX, FiFileText } from 'react-icons/fi'
import PatientImportModal from '@/components/medicalBilling/PatientImportModal'
import BulkAssignModal from '@/components/medicalBilling/BulkAssignModal'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { formatDate } from '@/utils/formatDate'
import { usePermissions } from '@/hooks/usePermissions'
import PatientModal from '@/components/medicalBilling/PatientModal'
import ClaimModal from '@/components/medicalBilling/ClaimModal'
import { EligibilityStatusBadge, getEligibilityMeta } from '@/components/medicalBilling/PatientEligibilitySection'
import { exportToExcel } from '@/utils/exportExcel'

const CLAIM_STATUS_COLORS = {
    draft: 'secondary',
    ready: 'info',
    submitted: 'primary',
    accepted: 'success',
    rejected: 'danger',
    pending: 'warning',
    denied: 'danger',
    partially_paid: 'warning',
    paid: 'success',
    closed: 'secondary',
}

const getPatientMemberId = (patient) => {
    if (patient?.primary_insurance?.member_id) return patient.primary_insurance.member_id
    if (Array.isArray(patient?.insurances) && patient.insurances.length > 0) {
        const primary = patient.insurances.find(i => i.is_primary) || patient.insurances[0]
        return primary?.member_id || ''
    }
    return ''
}

const getPatientPayerName = (patient) => {
    if (patient?.primary_insurance?.payer?.name) return patient.primary_insurance.payer.name
    return ''
}

const isPatientDeadLead = (patient) => {
    if (!patient) return false
    if (['dead', 'inactive', 'deceased', 'archived'].includes(patient.status)) return true
    const latestCheck = patient.latest_eligibility_check
    return Boolean(latestCheck && latestCheck.status === 'checked' && latestCheck.eligible === false)
}

const isPatientAssigned = (patient) => {
    if (!patient) return false
    if (patient.assigned_to?.id || (typeof patient.assigned_to === 'number' && patient.assigned_to > 0)) return true
    if (Array.isArray(patient.assignees) && patient.assignees.length > 0) return true
    return false
}

const page = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlLeadType = searchParams.get('lead_type')
    const urlAssignmentStatus = searchParams.get('assignment_status')
    const { hasPermission } = usePermissions()
    const [patients, setPatients] = useState([])
    const [total, setTotal] = useState(0)
    const [leadCounts, setLeadCounts] = useState({
        active_leads: 0,
        dead_leads: 0,
        assigned_leads: 0,
        unassigned_leads: 0,
        all_leads: 0,
    })
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState('')

    // Search & filter states
    const [leadType, setLeadType] = useState(() => (
        ['active', 'dead', 'all'].includes(urlLeadType) ? urlLeadType : 'active'
    )) // 'active' | 'dead' | 'all'
    const [assignmentFilter, setAssignmentFilter] = useState(() => (
        ['assigned', 'unassigned'].includes(urlAssignmentStatus) ? urlAssignmentStatus : ''
    )) // '' | 'assigned' | 'unassigned'

    useEffect(() => {
        if (['active', 'dead', 'all'].includes(urlLeadType)) {
            setLeadType(urlLeadType)
        }
        if (urlAssignmentStatus !== null) {
            setAssignmentFilter(['assigned', 'unassigned'].includes(urlAssignmentStatus) ? urlAssignmentStatus : '')
        }
    }, [urlLeadType, urlAssignmentStatus])
    const [eligibilityFilter, setEligibilityFilter] = useState('') // '' | 'eligible' | 'not_eligible' | 'not_checked'
    const [searchTerm, setSearchTerm] = useState('')
    const [memberIdFilter, setMemberIdFilter] = useState('')
    const [dobFilter, setDobFilter] = useState('')
    const [billingFilter, setBillingFilter] = useState('') // '' | 'billed' | 'unbilled'

    const [patientModal, setPatientModal] = useState(null) // { id, mode } | null
    const [claimModalId, setClaimModalId] = useState(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [selectedIds, setSelectedIds] = useState([])
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)

    const assignablePatients = patients.filter(p => !isPatientDeadLead(p))

    const toggleSelected = (id) => {
        const target = patients.find(p => p.id === id)
        if (target && isPatientDeadLead(target)) return
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleSelectAll = () => {
        const assignableIds = assignablePatients.map(p => p.id)
        setSelectedIds(prev => prev.length === assignableIds.length ? [] : assignableIds)
    }

    const buildQueryParams = (extra = {}) => {
        const params = {
            lead_type: leadType,
            ...extra,
        }
        if (assignmentFilter) params.assignment_status = assignmentFilter
        if (eligibilityFilter) params.eligibility_status = eligibilityFilter
        if (searchTerm.trim()) params.search = searchTerm.trim()
        if (memberIdFilter.trim()) params.member_id = memberIdFilter.trim()
        if (dobFilter) params.dob = dobFilter
        if (billingFilter) params.billing_status = billingFilter
        return params
    }

    const fetchPatients = async () => {
        try {
            setLoading(true)
            const params = buildQueryParams()
            const response = await crmInstance.get('/medical-billing/patients', { params })

            const data = response.data?.data
            setPatients(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            if (response.data?.lead_counts) {
                setLeadCounts(response.data.lead_counts)
            }
            setSelectedIds([])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load patients. Please try again.'
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view patients.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            setError(errorMessage)
            setPatients([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchPatients, 300) // debounce search & filters
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadType, assignmentFilter, eligibilityFilter, searchTerm, memberIdFilter, dobFilter, billingFilter])

    const handleExportPatients = async () => {
        try {
            setExporting(true)
            const params = buildQueryParams({ all: 1 })
            const response = await crmInstance.get('/medical-billing/patients', { params })
            const list = Array.isArray(response.data?.data) ? response.data.data : []

            if (list.length === 0) {
                Swal.fire({ title: 'No Data', text: 'No patients found to export.', icon: 'info' })
                return
            }

            exportToExcel('Patients_List', [
                {
                    name: 'Patients',
                    rows: list.map((p) => {
                        const claimsCount = Number(p.claims_count || (p.latest_claim ? 1 : 0))
                        const isBilled = claimsCount > 0
                        const eligMeta = getEligibilityMeta(p.latest_eligibility_check)
                        return {
                            'Patient #': p.patient_number || '',
                            'Full Name': [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' '),
                            'Date of Birth': p.date_of_birth ? formatDate(p.date_of_birth) : '',
                            'Gender': p.gender || '',
                            'Phone': p.phone || '',
                            'Email': p.email || '',
                            'Primary Payer': getPatientPayerName(p),
                            'Member ID': getPatientMemberId(p),
                            'Eligibility': eligMeta.shortLabel,
                            'Billing Status': isBilled ? 'Billed' : 'Not Billed',
                            'Claims Count': claimsCount,
                            'Latest Claim #': p.latest_claim?.claim_number || '',
                            'Latest Claim Status': p.latest_claim?.status ? p.latest_claim.status.replace(/_/g, ' ') : '',
                            'Total Billed ($)': Number(p.total_claim_charge || p.latest_claim?.total_charge || 0),
                            'Total Paid ($)': Number(p.total_claim_paid || p.latest_claim?.total_paid || 0),
                            'Assigned To': p.assigned_to?.name || 'Unassigned',
                            'Status': p.status || '',
                            'Address': p.address || '',
                            'City': p.city || '',
                            'State': p.state || '',
                            'Zip Code': p.zip_code || '',
                        }
                    }),
                },
            ])
        } catch (err) {
            Swal.fire({
                title: 'Export Failed',
                text: err.response?.data?.message || 'Could not download patients list.',
                icon: 'error',
            })
        } finally {
            setExporting(false)
        }
    }

    const handleDeletePatient = async (patientId, name) => {
        const result = await Swal.fire({
            title: 'Archive Patient',
            text: `Are you sure you want to archive "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Archive',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/patients/${patientId}`)
            setPatients(prev => prev.filter(p => p.id !== patientId))
            Swal.fire({
                title: 'Archived!',
                text: `Patient "${name}" has been archived.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to archive patient.',
                icon: 'error'
            })
        }
    }

    const hasActiveFilters = Boolean(
        leadType !== 'active' ||
        assignmentFilter ||
        eligibilityFilter ||
        searchTerm ||
        memberIdFilter ||
        dobFilter ||
        billingFilter
    )

    const clearFilters = () => {
        setLeadType('active')
        setAssignmentFilter('')
        setEligibilityFilter('')
        setSearchTerm('')
        setMemberIdFilter('')
        setDobFilter('')
        setBillingFilter('')
    }

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button
                        type="button"
                        className="btn btn-light-brand"
                        onClick={handleExportPatients}
                        disabled={exporting || loading}
                        title="Download Patients Excel"
                    >
                        <FiDownload className="me-2" />
                        {exporting ? 'Downloading...' : 'Download Patients'}
                    </button>
                    {hasPermission('medical_patients.create') && (
                        <button className="btn btn-light-brand" onClick={() => setShowImportModal(true)}>
                            <FiUpload className="me-2" />
                            Bulk Upload
                        </button>
                    )}
                    {hasPermission('medical_patients.create') && (
                        <Link href="/medical-billing/patients/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Patient
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

                                {/* Lead Workflow Tabs (Active Leads / Assigned In Billing / Unassigned / Dead Leads) */}
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom">
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${leadType === 'active' && !assignmentFilter ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => {
                                                setLeadType('active')
                                                setAssignmentFilter('')
                                            }}
                                        >
                                            Active Leads
                                            <span className={`badge ms-2 ${leadType === 'active' && !assignmentFilter ? 'bg-white text-primary' : 'bg-soft-primary text-primary'}`}>
                                                {leadCounts.active_leads}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm ${leadType === 'active' && assignmentFilter === 'assigned' ? 'btn-success' : 'btn-outline-success'}`}
                                            onClick={() => {
                                                setLeadType('active')
                                                setAssignmentFilter('assigned')
                                            }}
                                            title="Active leads that have been assigned and moved to Billing"
                                        >
                                            Assigned (In Billing)
                                            <span className={`badge ms-2 ${leadType === 'active' && assignmentFilter === 'assigned' ? 'bg-white text-success' : 'bg-soft-success text-success'}`}>
                                                {leadCounts.assigned_leads}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm ${leadType === 'active' && assignmentFilter === 'unassigned' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`}
                                            onClick={() => {
                                                setLeadType('active')
                                                setAssignmentFilter('unassigned')
                                            }}
                                            title="Active leads waiting to be assigned before entering Billing"
                                        >
                                            Unassigned (Pending Assignment)
                                            <span className="badge bg-soft-warning text-dark ms-2">
                                                {leadCounts.unassigned_leads}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm ${leadType === 'dead' ? 'btn-danger' : 'btn-outline-danger'}`}
                                            onClick={() => {
                                                setLeadType('dead')
                                                setAssignmentFilter('')
                                            }}
                                            title="Not Eligible / Dead Leads — excluded from Billing"
                                        >
                                            Dead Leads
                                            <span className={`badge ms-2 ${leadType === 'dead' ? 'bg-white text-danger' : 'bg-soft-danger text-danger'}`}>
                                                {leadCounts.dead_leads}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm ${leadType === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                            onClick={() => {
                                                setLeadType('all')
                                                setAssignmentFilter('')
                                            }}
                                        >
                                            All Leads
                                            <span className={`badge ms-2 ${leadType === 'all' ? 'bg-white text-dark' : 'bg-soft-secondary text-secondary'}`}>
                                                {leadCounts.all_leads}
                                            </span>
                                        </button>
                                    </div>

                                    <div className="text-muted small">
                                        {leadType === 'dead' ? (
                                            <span className="text-danger fw-semibold">
                                                Showing Dead Leads (Not Eligible / Inactive) — Dead leads do not proceed to Billing.
                                            </span>
                                        ) : assignmentFilter === 'unassigned' ? (
                                            <span className="text-warning fw-semibold">
                                                Assign these Active Leads to an employee to move them into Billing.
                                            </span>
                                        ) : assignmentFilter === 'assigned' ? (
                                            <span className="text-success fw-semibold">
                                                Showing Active Leads assigned to staff and active in Billing.
                                            </span>
                                        ) : (
                                            <span>
                                                Active Leads move to Billing once they are assigned.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className='row gy-2 mb-3'>
                                    <div className='col-12'>
                                        <div className='d-flex flex-wrap align-items-end justify-content-between gap-2'>
                                            <div className="d-flex flex-wrap align-items-end gap-2">
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Search Name / Patient #</label>
                                                    <input
                                                        type="text"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="Name, Member ID, DOB..."
                                                        className="form-control form-control-sm"
                                                        style={{ minWidth: '190px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Member ID</label>
                                                    <input
                                                        type="text"
                                                        value={memberIdFilter}
                                                        onChange={(e) => setMemberIdFilter(e.target.value)}
                                                        placeholder="Search Member ID..."
                                                        className="form-control form-control-sm"
                                                        style={{ minWidth: '145px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Date of Birth (DOB)</label>
                                                    <input
                                                        type="date"
                                                        value={dobFilter}
                                                        onChange={(e) => setDobFilter(e.target.value)}
                                                        className="form-control form-control-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Lead Type</label>
                                                    <select
                                                        value={leadType}
                                                        onChange={(e) => setLeadType(e.target.value)}
                                                        className="form-select form-select-sm"
                                                    >
                                                        <option value="active">Active Leads</option>
                                                        <option value="dead">Dead Leads</option>
                                                        <option value="all">All Leads</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Assignment Stage</label>
                                                    <select
                                                        value={assignmentFilter}
                                                        onChange={(e) => setAssignmentFilter(e.target.value)}
                                                        className="form-select form-select-sm"
                                                    >
                                                        <option value="">All Assignment Stages</option>
                                                        <option value="assigned">Assigned (Moved to Billing)</option>
                                                        <option value="unassigned">Unassigned (Not in Billing)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Eligibility</label>
                                                    <select
                                                        value={eligibilityFilter}
                                                        onChange={(e) => setEligibilityFilter(e.target.value)}
                                                        className="form-select form-select-sm"
                                                    >
                                                        <option value="">All Eligibility</option>
                                                        <option value="eligible">Eligible</option>
                                                        <option value="not_eligible">Not Eligible (Dead Lead)</option>
                                                        <option value="not_checked">Not Checked</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="form-label small text-muted mb-1">Billing / Claim</label>
                                                    <select
                                                        value={billingFilter}
                                                        onChange={(e) => setBillingFilter(e.target.value)}
                                                        className="form-select form-select-sm"
                                                    >
                                                        <option value="">All Claims</option>
                                                        <option value="billed">Billed (Claim Created)</option>
                                                        <option value="unbilled">Not Billed (No Claim)</option>
                                                    </select>
                                                </div>
                                                {hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={clearFilters}
                                                        title="Clear all filters"
                                                    >
                                                        <FiX className="me-1" /> Reset
                                                    </button>
                                                )}
                                            </div>

                                            <div className="d-flex align-items-center gap-2">
                                                {selectedIds.length > 0 && hasPermission('medical_patients.edit') && (
                                                    <button className="btn btn-sm btn-light-brand" onClick={() => setShowBulkAssignModal(true)}>
                                                        <FiUserCheck className="me-1" />
                                                        Assign {selectedIds.length} Selected
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} patient${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer align-middle">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 36 }}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        disabled={assignablePatients.length === 0}
                                                        checked={assignablePatients.length > 0 && selectedIds.length === assignablePatients.length}
                                                        onChange={toggleSelectAll}
                                                        title="Select active leads to assign"
                                                    />
                                                </th>
                                                <th>S.No</th>
                                                <th>Patient #</th>
                                                <th>Name</th>
                                                <th>Member ID</th>
                                                <th>DOB</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th>Eligibility</th>
                                                <th>Billing / Claim</th>
                                                <th>Assigned To</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="12" className="text-center py-4">
                                                        <Spinner classNames={{ label: "text-foreground mt-2" }} label="Loading patients..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : patients.length === 0 ? (
                                                <tr>
                                                    <td colSpan="12" className="text-center py-4">
                                                        {hasActiveFilters ? 'No patients found matching your search/filters.' : 'No patients found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                patients.map((patient, index) => {
                                                    const memberId = getPatientMemberId(patient)
                                                    const payerName = getPatientPayerName(patient)
                                                    const claimsCount = Number(patient.claims_count || (patient.latest_claim ? 1 : 0))
                                                    const latestClaim = patient.latest_claim || null
                                                    const totalBilled = Number(patient.total_claim_charge ?? latestClaim?.total_charge ?? 0)
                                                    const claimStatusColor = CLAIM_STATUS_COLORS[latestClaim?.status] || 'primary'
                                                    const isDead = isPatientDeadLead(patient)
                                                    const isAssigned = isPatientAssigned(patient)

                                                    return (
                                                        <tr key={patient.id}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    disabled={isDead}
                                                                    title={isDead ? 'Dead Leads cannot be assigned to Billing' : 'Select lead to assign'}
                                                                    checked={selectedIds.includes(patient.id)}
                                                                    onChange={() => toggleSelected(patient.id)}
                                                                />
                                                            </td>
                                                            <td>{index + 1}</td>
                                                            <td>{patient.patient_number}</td>
                                                            <td className="fw-semibold">
                                                                {[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')}
                                                            </td>
                                                            <td>
                                                                {memberId ? (
                                                                    <div>
                                                                        <span className="fw-semibold">{memberId}</span>
                                                                        {payerName && (
                                                                            <div className="text-muted" style={{ fontSize: '11px' }}>
                                                                                {payerName}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted small">—</span>
                                                                )}
                                                            </td>
                                                            <td>{formatDate(patient.date_of_birth) || 'N/A'}</td>
                                                            <td>{patient.phone || 'N/A'}</td>
                                                            <td>
                                                                {isDead ? (
                                                                    <div>
                                                                        <span className="badge bg-soft-danger text-danger">
                                                                            Dead Lead
                                                                        </span>
                                                                        {patient.status && patient.status !== 'dead' && patient.status !== 'active' && (
                                                                            <div className="text-muted text-capitalize" style={{ fontSize: '11px' }}>
                                                                                ({patient.status})
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="badge bg-soft-success text-success">
                                                                        Active Lead
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <EligibilityStatusBadge check={patient.latest_eligibility_check} compact />
                                                                {patient.latest_eligibility_check?.created_at && (
                                                                    <div className="text-muted" style={{ fontSize: '11px' }}>
                                                                        {formatDate(patient.latest_eligibility_check.created_at)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {claimsCount > 0 ? (
                                                                    <div>
                                                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                                                            <span className="badge bg-soft-success text-success">
                                                                                Billed ({claimsCount})
                                                                            </span>
                                                                            {latestClaim?.status && (
                                                                                <span className={`badge bg-soft-${claimStatusColor} text-${claimStatusColor} text-capitalize`}>
                                                                                    {latestClaim.status.replace(/_/g, ' ')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {latestClaim && (
                                                                            <div className="mt-1" style={{ fontSize: '11px' }}>
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-link btn-sm p-0 text-primary text-decoration-none fw-semibold"
                                                                                    style={{ fontSize: '11px' }}
                                                                                    onClick={() => setClaimModalId(latestClaim.id)}
                                                                                    title="Click to open Claim Details & Service Lines"
                                                                                >
                                                                                    <FiFileText className="me-1" size={11} />
                                                                                    {latestClaim.claim_number}
                                                                                </button>
                                                                                <span className="text-muted ms-1">
                                                                                    (${totalBilled.toFixed(2)})
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : isDead ? (
                                                                    <div>
                                                                        <span className="badge bg-soft-danger text-danger">
                                                                            Blocked (Dead Lead)
                                                                        </span>
                                                                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                                                                            Not sent to Billing
                                                                        </div>
                                                                    </div>
                                                                ) : !isAssigned ? (
                                                                    <div>
                                                                        <span className="badge bg-soft-secondary text-secondary">
                                                                            Pending Assignment
                                                                        </span>
                                                                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                                                                            Assign to move to Billing
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                                                            <span className="badge bg-soft-info text-info">
                                                                                In Billing
                                                                            </span>
                                                                            <span className="badge bg-soft-warning text-warning">
                                                                                Not Billed
                                                                            </span>
                                                                        </div>
                                                                        {Number(patient.charges_count || 0) > 0 ? (
                                                                            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                                                                                <Link href="/medical-billing/charges" className="text-info text-decoration-none">
                                                                                    {patient.charges_count} Charge Pending
                                                                                </Link>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                                                                                Ready for Encounter / Claim
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {isDead ? (
                                                                    <span className="text-danger small fw-medium">Dead Lead (No Billing)</span>
                                                                ) : isAssigned ? (
                                                                    <div>
                                                                        {patient.assigned_to?.name && (
                                                                            <span className="badge bg-soft-info text-info">{patient.assigned_to.name}</span>
                                                                        )}
                                                                        {Array.isArray(patient.assignees) && patient.assignees.length > 0 && (
                                                                            <span
                                                                                className="badge bg-soft-secondary text-secondary ms-1"
                                                                                title={patient.assignees.map(a => a.name).join(', ')}
                                                                            >
                                                                                {patient.assigned_to?.name ? `+${patient.assignees.length}` : patient.assignees.map(a => a.name).join(', ')}
                                                                            </span>
                                                                        )}
                                                                        <div className="text-success" style={{ fontSize: '10px' }}>
                                                                            Assigned for Billing
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="badge bg-soft-warning text-dark">Unassigned</span>
                                                                )}
                                                            </td>
                                                            <td className="text-end">
                                                                <div className="hstack gap-2 justify-content-end">
                                                                    {hasPermission('medical_patients.view') && (
                                                                        <button type="button" className="avatar-text avatar-md" title="View" onClick={() => setPatientModal({ id: patient.id, mode: 'view' })}>
                                                                            <FiEye />
                                                                        </button>
                                                                    )}
                                                                    {hasPermission('medical_patients.edit') && (
                                                                        <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setPatientModal({ id: patient.id, mode: 'edit' })}>
                                                                            <FiEdit3 />
                                                                        </button>
                                                                    )}
                                                                    {hasPermission('medical_patients.delete') && (
                                                                        <button
                                                                            type="button"
                                                                            className="avatar-text avatar-md"
                                                                            onClick={() => handleDeletePatient(patient.id, `${patient.first_name} ${patient.last_name}`)}
                                                                            title="Archive"
                                                                        >
                                                                            <FiTrash2 />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {patientModal && (
                <PatientModal
                    patientId={patientModal.id}
                    initialMode={patientModal.mode}
                    onClose={() => setPatientModal(null)}
                    onSaved={fetchPatients}
                />
            )}

            {claimModalId && (
                <ClaimModal
                    claimId={claimModalId}
                    onClose={() => setClaimModalId(null)}
                    onSaved={fetchPatients}
                />
            )}

            {showImportModal && (
                <PatientImportModal
                    onClose={() => setShowImportModal(false)}
                    onImported={fetchPatients}
                />
            )}

            {showBulkAssignModal && (
                <BulkAssignModal
                    patientIds={selectedIds}
                    onClose={() => setShowBulkAssignModal(false)}
                    onAssigned={fetchPatients}
                />
            )}
        </PermissionGuard>
    )
}

export default page
