'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FiUser, FiEdit3, FiDownload, FiShield, FiTrash2, FiClock } from 'react-icons/fi'
import Swal from 'sweetalert2'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { providerTypeLabel } from '@/constants/providerOptions'
import { STATUS_BADGE, PSV_STATUS_BADGE, PAYER_ENROLLMENT_STATUS_BADGE, INSURANCE_POLICY_STATUS_BADGE, formatStatusLabel, payerEnrollmentStatusLabel } from '@/constants/credentialingOptions'
import { formatDateTime, formatDate } from '@/utils/formatDate'
import { getExpiryStatus, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS } from '@/utils/expiryStatus'

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const Badge = ({ value, map, labelFn }) => (
    <span className={`badge bg-soft-${map[value] || 'secondary'} text-${map[value] || 'secondary'}`}>
        {(labelFn || formatStatusLabel)(value)}
    </span>
)

const ExpiryCell = ({ date }) => {
    if (!date) return 'N/A'
    const status = getExpiryStatus(date)
    return (
        <div className="d-flex flex-column gap-1">
            <span>{formatDate(date)}</span>
            {status !== 'active' && (
                <span className={`badge bg-soft-${EXPIRY_STATUS_BADGE[status]} text-${EXPIRY_STATUS_BADGE[status]}`}>
                    {EXPIRY_STATUS_LABELS[status]}
                </span>
            )}
        </div>
    )
}

const EmptyState = ({ message }) => <p className="text-muted mb-0">{message}</p>

const TABS = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'contact', label: 'Contact Info' },
    { key: 'documents', label: 'Documents' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'enrollments', label: 'Payer Enrollments' },
    { key: 'agreements', label: 'Agreements' },
    { key: 'followups', label: 'Follow-ups' },
    { key: 'notes', label: 'Notes' },
    { key: 'activity', label: 'Activity History' },
]

const page = () => {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'basic')
    const [data, setData] = useState(null)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')
    const [notes, setNotes] = useState([])
    const [newNote, setNewNote] = useState('')
    const [savingNote, setSavingNote] = useState(false)
    const [activity, setActivity] = useState([])
    const [loadingActivity, setLoadingActivity] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get(`/medical-billing/providers/${actualId}/profile`)
                setData(response.data)
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load provider profile.')
            } finally {
                setIsFetching(false)
            }
        }

        if (actualId) fetchProfile()
    }, [actualId])

    const credentialing = data?.credentialing

    useEffect(() => {
        if (!credentialing?.id) return
        (async () => {
            try {
                const response = await crmInstance.get(`/medical-billing/credentialing/${credentialing.id}/notes`)
                setNotes(Array.isArray(response.data) ? response.data : [])
            } catch {
                // notes list stays empty
            }
        })()
        ;(async () => {
            setLoadingActivity(true)
            try {
                const response = await crmInstance.get(`/medical-billing/credentialing/${credentialing.id}/activity`)
                setActivity(response.data?.data || [])
            } catch {
                // activity feed stays empty
            } finally {
                setLoadingActivity(false)
            }
        })()
    }, [credentialing?.id])

    const handleAddNote = async () => {
        if (!newNote.trim() || !credentialing?.id) return
        setSavingNote(true)
        try {
            const response = await crmInstance.post(`/medical-billing/credentialing/${credentialing.id}/notes`, { note: newNote })
            setNotes(prev => [response.data, ...prev])
            setNewNote('')
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to add note.', icon: 'error' })
        } finally {
            setSavingNote(false)
        }
    }

    const handleDeleteNote = async (note) => {
        const result = await Swal.fire({
            title: 'Delete Note',
            text: 'Are you sure you want to delete this note?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/credentialing/${credentialing.id}/notes/${note.id}`)
            setNotes(prev => prev.filter(n => n.id !== note.id))
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete note.', icon: 'error' })
        }
    }

    const handleDownload = (doc) => {
        crmInstance.get(`/medical-billing/credentialing-documents/${doc.id}/download`, { responseType: 'blob' }).then(res => {
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', doc.file_name)
            document.body.appendChild(link)
            link.click()
            link.remove()
        })
    }

    const currentUserId = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}').id
        } catch {
            return null
        }
    })()

    const goToTab = (key) => {
        setActiveTab(key)
        router.replace(`?tab=${key}`, { scroll: false })
    }

    return (
        <PermissionGuard permission="medical_providers.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {data && (
                        <button onClick={() => router.push(`/medical-billing/providers/edit/${encryptId(data.id)}`)} className="btn btn-primary">
                            <FiEdit3 className="me-2" />
                            Edit Provider
                        </button>
                    )}
                </div>
            </PageHeader>

            <div className='main-content'>
                {error && <div className="alert alert-danger">{error}</div>}

                {isFetching ? (
                    <div className="d-flex justify-content-center py-5">
                        <Spinner label="Loading provider profile..." variant="spinner" />
                    </div>
                ) : !data ? null : (
                    <div className='row g-4'>
                        <div className="col-lg-12">
                            <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                                <div className="card-body">
                                    <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                                        <FiUser /> {data.first_name} {data.last_name}
                                        <span className={`badge bg-soft-${data.status === 'active' ? 'success' : 'secondary'} text-${data.status === 'active' ? 'success' : 'secondary'} text-capitalize ms-2`}>
                                            {data.status}
                                        </span>
                                    </h2>
                                    <p className="text-muted mb-0 mt-1">NPI: {data.npi || 'N/A'} · {providerTypeLabel(data.provider_type)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-12">
                            <div className="card border-0" style={{ borderRadius: '20px' }}>
                                <div className="card-header bg-transparent overflow-auto">
                                    <ul className="nav nav-tabs flex-nowrap text-nowrap" style={{ border: 'none' }}>
                                        {TABS.map(tab => (
                                            <li className="nav-item" key={tab.key}>
                                                <button
                                                    type="button"
                                                    className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                                                    onClick={() => goToTab(tab.key)}
                                                >
                                                    {tab.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="card-body">
                                    {activeTab === 'basic' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing && (
                                                <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
                                                    <div className="d-flex gap-4 flex-wrap">
                                                        <div>
                                                            <div className="text-muted small">Overall Status</div>
                                                            <Badge value={credentialing.status} map={STATUS_BADGE} />
                                                        </div>
                                                        <div>
                                                            <div className="text-muted small">PSV Status</div>
                                                            <Badge value={credentialing.psv_status} map={PSV_STATUS_BADGE} />
                                                        </div>
                                                        <div>
                                                            <div className="text-muted small">Effective Date</div>
                                                            <div className="fw-semibold">{credentialing.effective_date || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted small">Expiration Date</div>
                                                            <div className="fw-semibold">{credentialing.expiration_date || '—'}</div>
                                                        </div>
                                                    </div>
                                                    <Link href={`/medical-billing/credentialing/edit/${encryptId(credentialing.id)}`} className="btn btn-sm btn-outline-primary">
                                                        <FiEdit3 className="me-1" /> Manage
                                                    </Link>
                                                </div>
                                            )}
                                            <div className="row g-4">
                                                <Field label="Provider Type" value={providerTypeLabel(data.provider_type)} />
                                                <Field label="Taxonomy Code" value={data.taxonomy_code} />
                                                <Field label="Specialty" value={data.specialty} />
                                                <Field label="NPI" value={data.npi} />
                                                <Field label="Tax ID / EIN" value={data.tax_id} />
                                                <Field label="License Number" value={data.license_number} />
                                                <Field label="Assigned Team Member" value={data.assigned_user?.name} />
                                                <Field label="Notes" value={data.notes} />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'addresses' && (
                                        <div className="tab-pane fade show active">
                                            <div className="row g-4">
                                                <Field label="Primary Address" value={[data.address, data.city, data.state, data.zip_code].filter(Boolean).join(', ')} />
                                                <Field label="Mailing Address" value={data.mailing_address} />
                                                <Field label="Billing Address" value={data.billing_address} />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'contact' && (
                                        <div className="tab-pane fade show active">
                                            <div className="row g-4 mb-3">
                                                <Field label="Phone" value={data.phone} />
                                                <Field label="Email" value={data.email} />
                                            </div>
                                            {data.contacts?.length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Name</th>
                                                                <th>Role / Title</th>
                                                                <th>Phone</th>
                                                                <th>Email</th>
                                                                <th>Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {data.contacts.map(c => (
                                                                <tr key={c.id}>
                                                                    <td>{c.name}</td>
                                                                    <td>{c.role_title || '—'}</td>
                                                                    <td>{c.phone || '—'}</td>
                                                                    <td>{c.email || '—'}</td>
                                                                    <td>{c.notes || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No additional contacts on file." />
                                            )}
                                        </div>
                                    )}

                                    {!credentialing && ['documents', 'insurance', 'enrollments', 'agreements', 'followups', 'notes', 'activity'].includes(activeTab) && (
                                        <div className="tab-pane fade show active text-center py-5">
                                            <FiShield size={32} className="text-muted mb-3" />
                                            <p className="text-muted">No credentialing record started yet for this provider.</p>
                                            <Link href={`/medical-billing/credentialing/create?provider_id=${data.id}`} className="btn btn-primary">
                                                Start Credentialing
                                            </Link>
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'documents' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing.documents?.length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Type</th>
                                                                <th>File</th>
                                                                <th>Status</th>
                                                                <th>Issue Date</th>
                                                                <th>Expiration Date</th>
                                                                <th>Uploaded By</th>
                                                                <th></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {credentialing.documents.map(doc => (
                                                                <tr key={doc.id}>
                                                                    <td>{formatStatusLabel(doc.document_type)}</td>
                                                                    <td>{doc.file_name}</td>
                                                                    <td>
                                                                        <span className={`badge bg-soft-${STATUS_BADGE[doc.status] || 'secondary'} text-${STATUS_BADGE[doc.status] || 'secondary'} text-capitalize`}>
                                                                            {doc.status || 'pending'}
                                                                        </span>
                                                                    </td>
                                                                    <td>{doc.issue_date || '—'}</td>
                                                                    <td><ExpiryCell date={doc.expiration_date} /></td>
                                                                    <td>{doc.uploaded_by?.name || 'N/A'}</td>
                                                                    <td className="text-end">
                                                                        <a href="#" onClick={(e) => { e.preventDefault(); handleDownload(doc) }} title="Download">
                                                                            <FiDownload />
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No documents uploaded yet." />
                                            )}

                                            <h6 className="fw-bold mt-4 mb-3">Verifications (PSV)</h6>
                                            {credentialing.verifications?.length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Type</th>
                                                                <th>Status</th>
                                                                <th>Verified Date</th>
                                                                <th>Expiration Date</th>
                                                                <th>Source</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {credentialing.verifications.map(v => (
                                                                <tr key={v.id}>
                                                                    <td>{formatStatusLabel(v.type)}</td>
                                                                    <td><Badge value={v.status} map={STATUS_BADGE} /></td>
                                                                    <td>{v.verified_date || '—'}</td>
                                                                    <td><ExpiryCell date={v.expiration_date} /></td>
                                                                    <td>{v.source || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No verifications tracked yet." />
                                            )}
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'insurance' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing.insurance_policies?.length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Insurance Company</th>
                                                                <th>Policy Type</th>
                                                                <th>Policy Number</th>
                                                                <th>Effective</th>
                                                                <th>Expiration</th>
                                                                <th>Coverage Limit</th>
                                                                <th>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {credentialing.insurance_policies.map(policy => (
                                                                <tr key={policy.id}>
                                                                    <td>{policy.insurance_company}</td>
                                                                    <td>{policy.policy_type || '—'}</td>
                                                                    <td>{policy.policy_number || '—'}</td>
                                                                    <td>{policy.effective_date || '—'}</td>
                                                                    <td><ExpiryCell date={policy.expiration_date} /></td>
                                                                    <td>{policy.coverage_limit || '—'}</td>
                                                                    <td><Badge value={policy.status} map={INSURANCE_POLICY_STATUS_BADGE} /></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No insurance policies on file." />
                                            )}
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'enrollments' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing.payer_enrollments?.length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Payer</th>
                                                                <th>Status</th>
                                                                <th>Enrollment Type</th>
                                                                <th>Payer Provider ID</th>
                                                                <th>Contract #</th>
                                                                <th>Effective</th>
                                                                <th>Expiration</th>
                                                                <th>Next Follow-up</th>
                                                                <th>Assigned To</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {credentialing.payer_enrollments.map(pe => (
                                                                <tr key={pe.id}>
                                                                    <td>{pe.payer?.name || 'N/A'}</td>
                                                                    <td><Badge value={pe.status} map={PAYER_ENROLLMENT_STATUS_BADGE} labelFn={payerEnrollmentStatusLabel} /></td>
                                                                    <td>{pe.enrollment_type || '—'}</td>
                                                                    <td>{pe.payer_provider_id || '—'}</td>
                                                                    <td>{pe.contract_number || '—'}</td>
                                                                    <td>{pe.effective_date || '—'}</td>
                                                                    <td><ExpiryCell date={pe.expiration_date} /></td>
                                                                    <td>{pe.next_follow_up_date || '—'}</td>
                                                                    <td>{pe.assigned_user?.name || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No payer enrollments tracked yet." />
                                            )}
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'agreements' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing.documents?.filter(d => d.payer_enrollment).length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Payer</th>
                                                                <th>Document Type</th>
                                                                <th>File</th>
                                                                <th>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {credentialing.documents.filter(d => d.payer_enrollment).map(doc => (
                                                                <tr key={doc.id}>
                                                                    <td>{doc.payer_enrollment?.payer?.name || 'N/A'}</td>
                                                                    <td>{formatStatusLabel(doc.document_type)}</td>
                                                                    <td>{doc.file_name}</td>
                                                                    <td>
                                                                        <span className={`badge bg-soft-${STATUS_BADGE[doc.status] || 'secondary'} text-${STATUS_BADGE[doc.status] || 'secondary'} text-capitalize`}>
                                                                            {doc.status || 'pending'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No agreements uploaded yet." />
                                            )}
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'followups' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing.payer_enrollments?.length ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Payer</th>
                                                                <th>Follow-up Due</th>
                                                                <th>Last Follow-up</th>
                                                                <th>Next Follow-up</th>
                                                                <th>Assigned To</th>
                                                                <th>Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {credentialing.payer_enrollments.map(pe => (
                                                                <tr key={pe.id}>
                                                                    <td>{pe.payer?.name || 'N/A'}</td>
                                                                    <td>{pe.follow_up_due_date || '—'}</td>
                                                                    <td>{pe.last_follow_up_date || '—'}</td>
                                                                    <td>{pe.next_follow_up_date || '—'}</td>
                                                                    <td>{pe.assigned_user?.name || '—'}</td>
                                                                    <td>{pe.follow_up_notes || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState message="No follow-ups tracked yet." />
                                            )}
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'notes' && (
                                        <div className="tab-pane fade show active">
                                            {credentialing.notes && (
                                                <div className="mb-4 pb-3 border-bottom">
                                                    <h6 className="fw-bold mb-2">Summary Notes</h6>
                                                    <p className="mb-0">{credentialing.notes}</p>
                                                </div>
                                            )}
                                            <div className="input-group mb-3">
                                                <textarea
                                                    className="form-control"
                                                    rows={4}
                                                    placeholder="Add a note..."
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    disabled={savingNote}
                                                />
                                                <button type="button" className="btn btn-primary" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
                                                    {savingNote ? (
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    ) : 'Add'}
                                                </button>
                                            </div>
                                            {notes.length === 0 ? (
                                                <EmptyState message="No notes yet." />
                                            ) : (
                                                <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                                                    {notes.map(note => (
                                                        <li key={note.id} className="border-bottom pb-2">
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div>
                                                                    <div className="fw-semibold">{note.user?.name || 'Unknown'}</div>
                                                                    <div className="text-muted small">{formatDateTime(note.created_at)}</div>
                                                                </div>
                                                                {(note.user_id === currentUserId || hasPermission('medical_credentialing.manage')) && (
                                                                    <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteNote(note)} title="Delete note">
                                                                        <FiTrash2 />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="mb-0 mt-1">{note.note}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {credentialing && activeTab === 'activity' && (
                                        <div className="tab-pane fade show active">
                                            {loadingActivity ? (
                                                <div className="d-flex justify-content-center py-3"><Spinner label="Loading activity..." variant="spinner" /></div>
                                            ) : activity.length === 0 ? (
                                                <EmptyState message="No activity recorded yet." />
                                            ) : (
                                                <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                                                    {activity.map(item => (
                                                        <li key={item.id} className="d-flex gap-2">
                                                            <FiClock className="text-muted mt-1" />
                                                            <div>
                                                                <div>{item.description}</div>
                                                                <div className="text-muted small">
                                                                    {item.user_name || 'System'} · {formatDateTime(item.created_at)}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGuard>
    )
}

export default page
