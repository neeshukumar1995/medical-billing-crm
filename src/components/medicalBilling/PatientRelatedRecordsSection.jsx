'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import {
    FiFileText,
    FiDollarSign,
    FiAlertTriangle,
    FiCreditCard,
    FiFolder,
    FiActivity,
    FiExternalLink,
    FiDownload,
    FiUpload,
    FiEye,
    FiTrendingUp,
} from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import { usePermissions } from '@/hooks/usePermissions'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'

const formatCurrency = (val) => {
    const num = Number(val || 0)
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const getStatusBadgeColor = (status) => {
    const s = String(status || '').toLowerCase()
    if (['paid', 'posted', 'resolved', 'completed', 'closed', 'active'].includes(s)) return 'success'
    if (['partially_paid', 'submitted', 'billed', 'open', 'in_progress'].includes(s)) return 'primary'
    if (['draft', 'pending', 'follow_up', 'patient_balance'].includes(s)) return 'warning'
    if (['denied', 'rejected', 'cancelled', 'error'].includes(s)) return 'danger'
    return 'secondary'
}

const getAgingBadgeColor = (bucket) => {
    if (bucket === '0-30') return 'success'
    if (bucket === '31-60') return 'info'
    if (bucket === '61-90') return 'warning'
    if (bucket === '90+') return 'danger'
    return 'secondary'
}

const formatProviderName = (provider) => {
    if (!provider || typeof provider !== 'object') return '—'
    return [provider.first_name, provider.last_name].filter(Boolean).join(' ') || provider.name || '—'
}

const safeText = (val, fallback = '—') => {
    if (val === null || val === undefined || val === '') return fallback
    if (typeof val === 'object') {
        return String(val.name || val.code || val.title || val.label || fallback)
    }
    return String(val)
}

export default function PatientRelatedRecordsSection({
    patient,
    patientId,
    compact = false,
    onRefresh,
    onCloseModal,
}) {
    const { hasPermission } = usePermissions()
    const resolvedPatientId = patientId || patient?.id

    const claims = patient?.claims || []
    const charges = patient?.charges || []
    const arAccounts = patient?.ar_accounts || []
    const patientPayments = patient?.patient_payments || []
    const denials = patient?.denials || []
    const documents = patient?.documents || []

    // Inline Document Upload state
    const [showUploadForm, setShowUploadForm] = useState(false)
    const [uploadFile, setUploadFile] = useState(null)
    const [documentType, setDocumentType] = useState('')
    const [selectedClaimId, setSelectedClaimId] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')

    // Financial Summary Calculations
    const totalClaimCharges = claims.reduce((sum, c) => sum + Number(c.total_charge || 0), 0)
    const totalRawCharges = charges.reduce((sum, ch) => sum + Number(ch.total_charge || 0), 0)
    const totalBilled = totalClaimCharges > 0 ? totalClaimCharges : totalRawCharges
    const totalInsurancePaid = claims.reduce((sum, c) => sum + Number(c.total_paid || 0), 0)
    const totalPatientPaid = patientPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const totalArBalance = arAccounts.reduce((sum, ar) => sum + Number(ar.total_balance || 0), 0)
    const totalInsAr = arAccounts.reduce((sum, ar) => sum + Number(ar.insurance_balance || 0), 0)
    const totalPatAr = arAccounts.reduce((sum, ar) => sum + Number(ar.patient_balance || 0), 0)

    const handleDownloadDocument = async (doc) => {
        try {
            const response = await crmInstance.get(`/medical-billing/documents/${doc.id}/download`, {
                responseType: 'blob',
            })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', doc.file_name || `document-${doc.id}`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to download document.', icon: 'error' })
        }
    }

    const handleUploadDocument = async (e) => {
        e.preventDefault()
        if (!uploadFile || !documentType) return
        setUploading(true)
        setUploadError('')

        try {
            const formData = new FormData()
            formData.append('file', uploadFile)
            formData.append('document_type', documentType)
            formData.append('patient_id', resolvedPatientId)
            if (selectedClaimId) {
                formData.append('claim_id', selectedClaimId)
            }

            await crmInstance.post('/medical-billing/documents', formData)
            setShowUploadForm(false)
            setUploadFile(null)
            setDocumentType('')
            setSelectedClaimId('')
            if (onRefresh) await onRefresh()
            Swal.fire({
                title: 'Uploaded!',
                text: 'Document uploaded successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            })
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setUploadError(
                validationErrors
                    ? Object.values(validationErrors).flat().join(' ')
                    : err.response?.data?.message || 'Failed to upload document'
            )
        } finally {
            setUploading(false)
        }
    }

    const HeadingTag = compact ? 'h6' : 'h5'

    return (
        <div>
            {/* ── Patient Financial Summary Strip ───────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiTrendingUp className="text-primary" /> Patient Billing & Financial Summary
                </HeadingTag>
            </div>
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-xl-3">
                    <div className="p-3 rounded-3 border bg-light bg-opacity-50 h-100">
                        <div className="text-muted small fw-medium mb-1">Total Billed / Charges</div>
                        <div className="fs-5 fw-bold text-dark">{formatCurrency(totalBilled)}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {claims.length} Claim{claims.length === 1 ? '' : 's'} &middot; {charges.length} Charge{charges.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="p-3 rounded-3 border bg-light bg-opacity-50 h-100">
                        <div className="text-muted small fw-medium mb-1">Insurance Paid</div>
                        <div className="fs-5 fw-bold text-success">{formatCurrency(totalInsurancePaid)}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Posted claim payments
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="p-3 rounded-3 border bg-light bg-opacity-50 h-100">
                        <div className="text-muted small fw-medium mb-1">Patient Paid</div>
                        <div className="fs-5 fw-bold text-info">{formatCurrency(totalPatientPaid)}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {patientPayments.length} Receipt{patientPayments.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="p-3 rounded-3 border bg-light bg-opacity-50 h-100">
                        <div className="text-muted small fw-medium mb-1">Outstanding A/R Balance</div>
                        <div className={`fs-5 fw-bold ${totalArBalance > 0 ? 'text-danger' : 'text-success'}`}>
                            {formatCurrency(totalArBalance)}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Ins: {formatCurrency(totalInsAr)} &middot; Pat: {formatCurrency(totalPatAr)}
                        </div>
                    </div>
                </div>
            </div>

            <hr className="my-4" />

            {/* ── Claims ────────────────────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiFileText className="text-primary" />
                    Claims
                    <span className="badge bg-soft-primary text-primary ms-1">{claims.length}</span>
                </HeadingTag>
                <Link
                    href="/medical-billing/claims"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onCloseModal}
                >
                    <FiExternalLink className="me-1" /> All Claims
                </Link>
            </div>
            {claims.length === 0 ? (
                <p className="text-muted small mb-4">No claims generated for this patient yet.</p>
            ) : (
                <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Claim #</th>
                                <th>Type</th>
                                <th>Payer</th>
                                <th>Provider</th>
                                <th>Total Charge</th>
                                <th>Paid</th>
                                <th>Patient Resp.</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th className="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.map((c) => {
                                const badgeColor = getStatusBadgeColor(c.status)
                                return (
                                    <tr key={c.id}>
                                        <td className="fw-semibold">
                                            <Link
                                                href={`/medical-billing/claims/${encryptId(c.id)}`}
                                                className="text-primary text-decoration-none"
                                                onClick={onCloseModal}
                                            >
                                                {c.claim_number}
                                            </Link>
                                        </td>
                                        <td>
                                            <span className="badge bg-soft-secondary text-secondary">{c.claim_type || '837P'}</span>
                                        </td>
                                        <td>{c.payer?.name || '—'}</td>
                                        <td>{formatProviderName(c.provider)}</td>
                                        <td className="fw-semibold">{formatCurrency(c.total_charge)}</td>
                                        <td className="text-success">{formatCurrency(c.total_paid)}</td>
                                        <td>{formatCurrency(c.patient_responsibility)}</td>
                                        <td>
                                            <span className={`badge bg-soft-${badgeColor} text-${badgeColor} text-capitalize`}>
                                                {c.status?.replace(/_/g, ' ') || 'draft'}
                                            </span>
                                        </td>
                                        <td>{c.submitted_at ? formatDate(c.submitted_at) : '—'}</td>
                                        <td className="text-end">
                                            <Link
                                                href={`/medical-billing/claims/${encryptId(c.id)}`}
                                                className="btn btn-sm btn-light"
                                                title="View Claim Details"
                                                onClick={onCloseModal}
                                            >
                                                <FiEye size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <hr className="my-4" />

            {/* ── Charges ───────────────────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiDollarSign className="text-success" />
                    Charges
                    <span className="badge bg-soft-success text-success ms-1">{charges.length}</span>
                </HeadingTag>
                <Link
                    href="/medical-billing/charges"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onCloseModal}
                >
                    <FiExternalLink className="me-1" /> All Charges
                </Link>
            </div>
            {charges.length === 0 ? (
                <p className="text-muted small mb-4">No billing charges recorded for this patient yet.</p>
            ) : (
                <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Charge #</th>
                                <th>DOS From</th>
                                <th>DOS To</th>
                                <th>Provider</th>
                                <th>CPT / Line Items</th>
                                <th>Total Charge</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {charges.map((ch) => {
                                const badgeColor = getStatusBadgeColor(ch.status)
                                const items = ch.items || []
                                return (
                                    <tr key={ch.id}>
                                        <td className="fw-semibold">#{ch.id}</td>
                                        <td>{formatDate(ch.dos_from) || '—'}</td>
                                        <td>{formatDate(ch.dos_to) || '—'}</td>
                                        <td>{formatProviderName(ch.provider)}</td>
                                        <td>
                                            {items.length === 0 ? (
                                                <span className="text-muted small">No items</span>
                                            ) : (
                                                <div className="d-flex flex-wrap gap-1">
                                                    {items.map((item) => {
                                                        const codeStr = safeText(item.code || item.cpt_code || item.hcpcs_code, 'Line Item')
                                                        return (
                                                            <span
                                                                key={item.id}
                                                                className="badge bg-soft-info text-info"
                                                                title={`Diagnosis Pointer: ${safeText(item.diagnosis_pointer, 'N/A')} | Units: ${Number(item.units || 1)} | Amt: ${formatCurrency(item.charge_amount)}`}
                                                            >
                                                                {codeStr} ({Number(item.units || 1)}x)
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="fw-semibold">{formatCurrency(ch.total_charge)}</td>
                                        <td>
                                            <span className={`badge bg-soft-${badgeColor} text-${badgeColor} text-capitalize`}>
                                                {ch.status?.replace(/_/g, ' ') || 'draft'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <hr className="my-4" />

            {/* ── A/R Accounts & Follow-ups ─────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiActivity className="text-warning" />
                    A/R Accounts & Aging
                    <span className="badge bg-soft-warning text-warning ms-1">{arAccounts.length}</span>
                </HeadingTag>
                <Link
                    href="/medical-billing/ar"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onCloseModal}
                >
                    <FiExternalLink className="me-1" /> A/R Worklist
                </Link>
            </div>
            {arAccounts.length === 0 ? (
                <p className="text-muted small mb-4">No A/R accounts on file for this patient.</p>
            ) : (
                <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Claim #</th>
                                <th>Payer</th>
                                <th>Insurance Bal.</th>
                                <th>Patient Bal.</th>
                                <th>Total Balance</th>
                                <th>Aging</th>
                                <th>Status</th>
                                <th>Latest Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            {arAccounts.map((ar) => {
                                const statusColor = getStatusBadgeColor(ar.status)
                                const agingColor = getAgingBadgeColor(ar.aging_bucket)
                                const latestFollowup = ar.followups?.[0] || null
                                return (
                                    <tr key={ar.id}>
                                        <td className="fw-semibold">
                                            {ar.claim ? (
                                                <Link
                                                    href={`/medical-billing/claims/${encryptId(ar.claim.id)}`}
                                                    className="text-primary text-decoration-none"
                                                    onClick={onCloseModal}
                                                >
                                                    {ar.claim.claim_number}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td>{ar.payer?.name || '—'}</td>
                                        <td>{formatCurrency(ar.insurance_balance)}</td>
                                        <td>{formatCurrency(ar.patient_balance)}</td>
                                        <td className="fw-bold">{formatCurrency(ar.total_balance)}</td>
                                        <td>
                                            <span className={`badge bg-soft-${agingColor} text-${agingColor}`}>
                                                {ar.aging_bucket || '0-30'} days
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge bg-soft-${statusColor} text-${statusColor} text-capitalize`}>
                                                {ar.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {latestFollowup ? (
                                                <div className="small">
                                                    <span className="fw-semibold">{formatDate(latestFollowup.followup_date)}</span>
                                                    {(latestFollowup.note || latestFollowup.notes) && (
                                                        <span className="text-muted ms-1">— {safeText(latestFollowup.note || latestFollowup.notes)}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted small">No follow-ups</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <hr className="my-4" />

            {/* ── Denials ───────────────────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiAlertTriangle className="text-danger" />
                    Claim Denials
                    <span className="badge bg-soft-danger text-danger ms-1">{denials.length}</span>
                </HeadingTag>
                <Link
                    href="/medical-billing/denials"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onCloseModal}
                >
                    <FiExternalLink className="me-1" /> Denials Management
                </Link>
            </div>
            {denials.length === 0 ? (
                <p className="text-muted small mb-4">No claim denials recorded for this patient.</p>
            ) : (
                <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Claim #</th>
                                <th>Denial Code</th>
                                <th>Reason</th>
                                <th>Denial Date</th>
                                <th>Assigned To</th>
                                <th>Status</th>
                                <th>Latest Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {denials.map((d) => {
                                const badgeColor = getStatusBadgeColor(d.status)
                                const latestAction = d.actions?.[0] || null
                                return (
                                    <tr key={d.id}>
                                        <td className="fw-semibold">
                                            {d.claim ? (
                                                <Link
                                                    href={`/medical-billing/claims/${encryptId(d.claim.id)}`}
                                                    className="text-primary text-decoration-none"
                                                    onClick={onCloseModal}
                                                >
                                                    {d.claim.claim_number}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td>
                                            <span className="badge bg-soft-danger text-danger">{d.denial_code || 'N/A'}</span>
                                        </td>
                                        <td>{d.reason || '—'}</td>
                                        <td>{formatDate(d.denial_date) || '—'}</td>
                                        <td>{d.assigned_to?.name || 'Unassigned'}</td>
                                        <td>
                                            <span className={`badge bg-soft-${badgeColor} text-${badgeColor} text-capitalize`}>
                                                {d.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {latestAction ? (
                                                <span className="small text-capitalize">
                                                    {latestAction.action_type?.replace(/_/g, ' ')} ({formatDate(latestAction.action_date)})
                                                </span>
                                            ) : (
                                                <span className="text-muted small">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <hr className="my-4" />

            {/* ── Patient Payments / Receipts ───────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiCreditCard className="text-info" />
                    Patient Payments & Receipts
                    <span className="badge bg-soft-info text-info ms-1">{patientPayments.length}</span>
                </HeadingTag>
                <Link
                    href="/medical-billing/patient-payments"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onCloseModal}
                >
                    <FiExternalLink className="me-1" /> Patient Payments
                </Link>
            </div>
            {patientPayments.length === 0 ? (
                <p className="text-muted small mb-4">No direct patient payments recorded yet.</p>
            ) : (
                <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Receipt #</th>
                                <th>Payment Date</th>
                                <th>Claim #</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Notes</th>
                                <th>Recorded By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patientPayments.map((pmt) => (
                                <tr key={pmt.id}>
                                    <td className="fw-semibold">{pmt.receipt_number}</td>
                                    <td>{formatDate(pmt.payment_date) || '—'}</td>
                                    <td>
                                        {pmt.claim ? (
                                            <Link
                                                href={`/medical-billing/claims/${encryptId(pmt.claim.id)}`}
                                                className="text-primary text-decoration-none"
                                                onClick={onCloseModal}
                                            >
                                                {pmt.claim.claim_number}
                                            </Link>
                                        ) : (
                                            'Unallocated'
                                        )}
                                    </td>
                                    <td className="text-capitalize">{pmt.method?.replace(/_/g, ' ') || '—'}</td>
                                    <td>{pmt.reference || '—'}</td>
                                    <td className="fw-bold text-success">{formatCurrency(pmt.amount)}</td>
                                    <td className="small text-muted">{pmt.notes || '—'}</td>
                                    <td>{pmt.created_by?.name || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <hr className="my-4" />

            {/* ── Patient Documents ─────────────────────────────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiFolder className="text-secondary" />
                    Documents
                    <span className="badge bg-soft-secondary text-secondary ms-1">{documents.length}</span>
                </HeadingTag>
                <div className="d-flex align-items-center gap-2">
                    {hasPermission('medical_documents.manage') && !showUploadForm && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setShowUploadForm(true)}
                        >
                            <FiUpload className="me-1" /> Upload Document
                        </button>
                    )}
                </div>
            </div>

            {showUploadForm && (
                <form onSubmit={handleUploadDocument} className="border rounded p-3 mb-4 bg-light bg-opacity-50">
                    {uploadError && <div className="alert alert-danger py-2">{uploadError}</div>}
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold">
                                File <span className="text-danger">*</span>
                            </label>
                            <input
                                type="file"
                                className="form-control form-control-sm"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                required
                                disabled={uploading}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-semibold">
                                Document Type <span className="text-danger">*</span>
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                                required
                                disabled={uploading}
                            >
                                <option value="">Select type</option>
                                <option value="insurance_card">Insurance Card</option>
                                <option value="lab_result">Lab Result</option>
                                <option value="referral">Referral</option>
                                <option value="eob">EOB</option>
                                <option value="consent_form">Consent Form</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-semibold">Linked Claim (Optional)</label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedClaimId}
                                onChange={(e) => setSelectedClaimId(e.target.value)}
                                disabled={uploading}
                            >
                                <option value="">None</option>
                                {claims.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.claim_number} ({formatCurrency(c.total_charge)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2 d-flex gap-2">
                            <button type="submit" className="btn btn-sm btn-primary" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                    setShowUploadForm(false)
                                    setUploadError('')
                                }}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {documents.length === 0 ? (
                <p className="text-muted small mb-0">No documents uploaded for this patient yet.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Type</th>
                                <th>Claim #</th>
                                <th>Uploaded By</th>
                                <th>Date</th>
                                <th className="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc.id}>
                                    <td className="fw-semibold">{doc.file_name}</td>
                                    <td>
                                        <span className="badge bg-soft-info text-info text-capitalize">
                                            {doc.document_type?.replace(/_/g, ' ') || 'Document'}
                                        </span>
                                    </td>
                                    <td>{doc.claim?.claim_number || '—'}</td>
                                    <td>{doc.uploaded_by?.name || '—'}</td>
                                    <td>{formatDate(doc.created_at) || '—'}</td>
                                    <td className="text-end">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light"
                                            title="Download Document"
                                            onClick={() => handleDownloadDocument(doc)}
                                        >
                                            <FiDownload size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

