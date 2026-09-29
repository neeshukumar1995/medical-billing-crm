'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FiEdit3, FiCheckCircle } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { encryptId } from '@/utils/encryptId'
import {
    PAYER_ENROLLMENT_STATUS_OPTIONS,
    FOLLOW_UP_BUCKET_OPTIONS,
    FOLLOW_UP_BUCKET_BADGE,
    payerEnrollmentStatusLabel,
    formatStatusLabel,
} from '@/constants/credentialingOptions'
import { todayInputDate } from '@/utils/formatDate'

const page = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const [records, setRecords] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [bucket, setBucket] = useState(searchParams.get('bucket') || '')
    const [status, setStatus] = useState('')
    const [assignedToMe, setAssignedToMe] = useState(false)
    const [completingId, setCompletingId] = useState(null)

    const currentUserId = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}').id
        } catch {
            return null
        }
    })()

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const params = {}
            if (bucket) params.bucket = bucket
            if (status) params.status = status
            if (assignedToMe && currentUserId) params.assigned_to = currentUserId

            const response = await crmInstance.get('/medical-billing/credentialing-followups', { params })
            const data = response.data?.data
            setRecords(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load follow-ups. Please try again.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view follow-ups.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setRecords([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    // useState(searchParams.get('bucket')) only reads the URL once, on first
    // mount — clicking "Overdue" from the sidebar while already on this page
    // navigates client-side without remounting, so that initializer never
    // re-runs and the filter silently stays on whatever it was before. This
    // effect re-syncs `bucket` whenever the URL's query string actually changes.
    useEffect(() => {
        setBucket(searchParams.get('bucket') || '')
    }, [searchParams])

    useEffect(() => {
        fetchRecords()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bucket, status, assignedToMe])

    // The update endpoint wholesale-replaces the credentialing record's full
    // payer_enrollments array on every save (see CredentialingController::update()),
    // so "mark completed" fetches the complete current record first and
    // resubmits every field unchanged except this one enrollment's follow-up
    // dates — sending only the one row being completed would silently delete
    // every sibling enrollment on that credentialing record.
    const handleMarkCompleted = async (record) => {
        const credentialingId = record.credentialing?.id
        if (!credentialingId) return

        setCompletingId(record.id)
        try {
            const { data: full } = await crmInstance.get(`/medical-billing/credentialing/${credentialingId}`)

            const payload = {
                provider_id: full.provider_id,
                status: full.status,
                psv_status: full.psv_status,
                psv_completed_date: full.psv_completed_date || null,
                effective_date: full.effective_date || null,
                expiration_date: full.expiration_date || null,
                notes: full.notes || null,
                verifications: (full.verifications || []).map(v => ({
                    type: v.type, status: v.status, verified_date: v.verified_date || null,
                    expiration_date: v.expiration_date || null, source: v.source || null, notes: v.notes || null,
                })),
                tasks: (full.tasks || []).map(t => ({
                    title: t.title, assignee: t.assignee || null, due_date: t.due_date || null, status: t.status,
                })),
                payer_enrollments: (full.payer_enrollments || []).map(pe => ({
                    payer_id: pe.payer_id,
                    status: pe.id === record.id ? 'completed' : pe.status,
                    enrollment_type: pe.enrollment_type || null,
                    payer_provider_id: pe.payer_provider_id || null,
                    contract_number: pe.contract_number || null,
                    applied_date: pe.applied_date || null,
                    approved_date: pe.approved_date || null,
                    effective_date: pe.effective_date || null,
                    expiration_date: pe.expiration_date || null,
                    follow_up_due_date: pe.follow_up_due_date || null,
                    last_follow_up_date: pe.id === record.id ? todayInputDate() : (pe.last_follow_up_date || null),
                    next_follow_up_date: pe.id === record.id ? null : (pe.next_follow_up_date || null),
                    follow_up_notes: pe.follow_up_notes || null,
                    assigned_to: pe.assigned_to || null,
                    notes: pe.notes || null,
                })),
            }

            await crmInstance.put(`/medical-billing/credentialing/${credentialingId}`, payload)
            await fetchRecords()
            Swal.fire({ title: 'Marked Completed!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to mark follow-up completed.', icon: 'error' })
        } finally {
            setCompletingId(null)
        }
    }

    return (
        <PermissionGuard permission="medical_credentialing.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link href="/medical-billing/credentialing/dashboard" className="btn btn-outline-primary">Dashboard</Link>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2 mb-3'>
                                    <div className="col-md-3">
                                        <label className="form-label small text-muted">Follow-up Status</label>
                                        <select className="form-select form-select-sm" value={bucket} onChange={(e) => setBucket(e.target.value)}>
                                            <option value="">All</option>
                                            {FOLLOW_UP_BUCKET_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small text-muted">Enrollment Status</label>
                                        <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                                            <option value="">All</option>
                                            {PAYER_ENROLLMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-3 d-flex align-items-end">
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${assignedToMe ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setAssignedToMe(prev => !prev)}
                                        >
                                            Assigned to Me
                                        </button>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} follow-up${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Provider</th>
                                                <th>Payer</th>
                                                <th>Enrollment Status</th>
                                                <th>Follow-up Due</th>
                                                <th>Last Follow-up</th>
                                                <th>Next Follow-up</th>
                                                <th>Assigned To</th>
                                                <th>Follow-up Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        <Spinner label="Loading follow-ups..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">No follow-ups found.</td>
                                                </tr>
                                            ) : (
                                                records.map(record => (
                                                    <tr key={record.id}>
                                                        <td>
                                                            {record.credentialing?.provider ? (
                                                                <Link href={`/medical-billing/providers/profile/${encryptId(record.credentialing.provider.id)}`}>
                                                                    {record.credentialing.provider.first_name} {record.credentialing.provider.last_name}
                                                                </Link>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>{record.payer?.name || 'N/A'}</td>
                                                        <td>{payerEnrollmentStatusLabel(record.status)}</td>
                                                        <td>{record.follow_up_due_date || '—'}</td>
                                                        <td>{record.last_follow_up_date || '—'}</td>
                                                        <td>{record.next_follow_up_date || '—'}</td>
                                                        <td>{record.assigned_user?.name || 'Unassigned'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${FOLLOW_UP_BUCKET_BADGE[record.follow_up_bucket] || 'secondary'} text-${FOLLOW_UP_BUCKET_BADGE[record.follow_up_bucket] || 'secondary'}`}>
                                                                {formatStatusLabel(record.follow_up_bucket)}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_credentialing.manage') && record.status !== 'completed' && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        title="Mark Completed"
                                                                        disabled={completingId === record.id}
                                                                        onClick={() => handleMarkCompleted(record)}
                                                                    >
                                                                        {completingId === record.id ? (
                                                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                                        ) : (
                                                                            <FiCheckCircle />
                                                                        )}
                                                                    </button>
                                                                )}
                                                                {record.credentialing?.id && (
                                                                    <Link href={`/medical-billing/credentialing/edit/${encryptId(record.credentialing.id)}`} className="avatar-text avatar-md" title="Manage">
                                                                        <FiEdit3 />
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
