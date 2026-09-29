'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiShield, FiPlus, FiTrash2, FiUpload, FiDownload, FiFile, FiEdit3, FiX, FiRefreshCw } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import {
    CREDENTIALING_STATUS_OPTIONS,
    PSV_STATUS_OPTIONS,
    VERIFICATION_TYPE_OPTIONS,
    VERIFICATION_STATUS_OPTIONS,
    TASK_STATUS_OPTIONS,
    PAYER_ENROLLMENT_STATUS_OPTIONS,
    DOCUMENT_TYPE_OPTIONS,
    DOCUMENT_STATUS_OPTIONS,
    INSURANCE_POLICY_STATUS_OPTIONS,
    STATUS_BADGE,
} from '@/constants/credentialingOptions'
import { getExpiryStatus, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS } from '@/utils/expiryStatus'

const emptyVerification = { type: 'npi', status: 'pending', verified_date: '', expiration_date: '', source: '', notes: '' }
const emptyTask = { title: '', assignee: '', due_date: '', status: 'pending' }
const emptyPayerEnrollment = {
    payer_id: '', status: 'not_started', enrollment_type: '', payer_provider_id: '', contract_number: '',
    applied_date: '', approved_date: '', effective_date: '', expiration_date: '',
    follow_up_due_date: '', last_follow_up_date: '', next_follow_up_date: '', follow_up_notes: '', assigned_to: '',
    notes: '',
}

const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'verifications', label: 'Verifications (PSV)' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'enrollments', label: 'Payer Enrollments' },
    { key: 'documents', label: 'Documents' },
    { key: 'policies', label: 'Liability Policies' },
]

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [activeTab, setActiveTab] = useState('overview')

    const [providerId, setProviderId] = useState('')
    const [status, setStatus] = useState('in_progress')
    const [psvStatus, setPsvStatus] = useState('pending')
    const [psvCompletedDate, setPsvCompletedDate] = useState('')
    const [effectiveDate, setEffectiveDate] = useState('')
    const [expirationDate, setExpirationDate] = useState('')
    const [notes, setNotes] = useState('')
    const [verifications, setVerifications] = useState([{ ...emptyVerification }])
    const [tasks, setTasks] = useState([{ ...emptyTask }])
    const [payerEnrollments, setPayerEnrollments] = useState([{ ...emptyPayerEnrollment }])
    const [savedVerifications, setSavedVerifications] = useState([]) // only verifications with a real id — for the document link dropdown
    const [savedPayerEnrollments, setSavedPayerEnrollments] = useState([]) // only payer enrollments with a real id — for the document link dropdown
    const [documents, setDocuments] = useState([])
    const [insurancePolicies, setInsurancePolicies] = useState([])

    const [providers, setProviders] = useState([])
    const [payers, setPayers] = useState([])
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    // Document upload form
    const [uploadFile, setUploadFile] = useState(null)
    const [uploadDocumentType, setUploadDocumentType] = useState('npi')
    const [uploadStatus, setUploadStatus] = useState('pending')
    const [uploadVerificationId, setUploadVerificationId] = useState('')
    const [uploadInsurancePolicyId, setUploadInsurancePolicyId] = useState('')
    const [uploadPayerEnrollmentId, setUploadPayerEnrollmentId] = useState('')
    const [uploadIssueDate, setUploadIssueDate] = useState('')
    const [uploadExpirationDate, setUploadExpirationDate] = useState('')
    const [uploadNotes, setUploadNotes] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')

    // Insurance / liability policy form
    const emptyPolicyForm = { insurance_company: '', policy_type: '', policy_number: '', effective_date: '', expiration_date: '', coverage_limit: '', status: 'active', notes: '' }
    const [policyForm, setPolicyForm] = useState(emptyPolicyForm)
    const [savingPolicy, setSavingPolicy] = useState(false)
    const [policyError, setPolicyError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const response = await crmInstance.get('/medical-billing/providers', { params: { per_page: 500 } })
                setProviders(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        })()
        ;(async () => {
            try {
                const response = await crmInstance.get('/medical-billing/insurance/payers', { params: { per_page: 500 } })
                setPayers(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        })()
        ;(async () => {
            try {
                const rawCid = localStorage.getItem('companyId')
                const cid = rawCid ? JSON.parse(rawCid) : null
                if (!cid) return
                const response = await crmInstance.get(`/users/${cid}`, { params: { all: 1 } })
                const userList = response.data
                setUsers(Array.isArray(userList) ? userList : [])
            } catch {
                // dropdown stays empty
            }
        })()
    }, [])

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get(`/medical-billing/credentialing/${actualId}`)
                const r = response.data
                setProviderId(r.provider_id || r.provider?.id || '')
                setStatus(r.status || 'in_progress')
                setPsvStatus(r.psv_status || 'pending')
                setPsvCompletedDate(r.psv_completed_date || '')
                setEffectiveDate(r.effective_date || '')
                setExpirationDate(r.expiration_date || '')
                setNotes(r.notes || '')
                setVerifications(
                    Array.isArray(r.verifications) && r.verifications.length > 0
                        ? r.verifications.map(v => ({
                            type: v.type || 'npi',
                            status: v.status || 'pending',
                            verified_date: v.verified_date || '',
                            expiration_date: v.expiration_date || '',
                            source: v.source || '',
                            notes: v.notes || '',
                        }))
                        : [{ ...emptyVerification }]
                )
                setTasks(
                    Array.isArray(r.tasks) && r.tasks.length > 0
                        ? r.tasks.map(t => ({
                            title: t.title || '',
                            assignee: t.assignee || '',
                            due_date: t.due_date || '',
                            status: t.status || 'pending',
                        }))
                        : [{ ...emptyTask }]
                )
                setPayerEnrollments(
                    Array.isArray(r.payer_enrollments) && r.payer_enrollments.length > 0
                        ? r.payer_enrollments.map(p => ({
                            payer_id: p.payer_id || p.payer?.id || '',
                            status: p.status || 'not_started',
                            enrollment_type: p.enrollment_type || '',
                            payer_provider_id: p.payer_provider_id || '',
                            contract_number: p.contract_number || '',
                            applied_date: p.applied_date || '',
                            approved_date: p.approved_date || '',
                            effective_date: p.effective_date || '',
                            expiration_date: p.expiration_date || '',
                            follow_up_due_date: p.follow_up_due_date || '',
                            last_follow_up_date: p.last_follow_up_date || '',
                            next_follow_up_date: p.next_follow_up_date || '',
                            follow_up_notes: p.follow_up_notes || '',
                            assigned_to: p.assigned_to || '',
                            notes: p.notes || '',
                        }))
                        : [{ ...emptyPayerEnrollment }]
                )
                setSavedVerifications(Array.isArray(r.verifications) ? r.verifications : [])
                setSavedPayerEnrollments(Array.isArray(r.payer_enrollments) ? r.payer_enrollments : [])
                setDocuments(Array.isArray(r.documents) ? r.documents : [])
                setInsurancePolicies(Array.isArray(r.insurance_policies) ? r.insurance_policies : [])
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load credentialing record.')
            } finally {
                setIsFetching(false)
            }
        }

        if (actualId) fetchRecord()
    }, [actualId])

    const updateVerification = (index, field, value) => {
        setVerifications(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
    }
    const addVerification = () => setVerifications(prev => [...prev, { ...emptyVerification }])
    const removeVerification = (index) => setVerifications(prev => prev.filter((_, i) => i !== index))

    const updateTask = (index, field, value) => {
        setTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
    }
    const addTask = () => setTasks(prev => [...prev, { ...emptyTask }])
    const removeTask = (index) => setTasks(prev => prev.filter((_, i) => i !== index))

    const updatePayerEnrollment = (index, field, value) => {
        setPayerEnrollments(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
    }
    const addPayerEnrollment = () => setPayerEnrollments(prev => [...prev, { ...emptyPayerEnrollment }])
    const removePayerEnrollment = (index) => setPayerEnrollments(prev => prev.filter((_, i) => i !== index))

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!uploadFile) return
        setUploading(true)
        setUploadError('')
        try {
            const formData = new FormData()
            formData.append('file', uploadFile)
            formData.append('document_type', uploadDocumentType)
            formData.append('status', uploadStatus)
            if (uploadVerificationId) formData.append('verification_id', uploadVerificationId)
            if (uploadInsurancePolicyId) formData.append('insurance_policy_id', uploadInsurancePolicyId)
            if (uploadPayerEnrollmentId) formData.append('payer_enrollment_id', uploadPayerEnrollmentId)
            if (uploadIssueDate) formData.append('issue_date', uploadIssueDate)
            if (uploadExpirationDate) formData.append('expiration_date', uploadExpirationDate)
            if (uploadNotes) formData.append('notes', uploadNotes)

            const response = await crmInstance.post(`/medical-billing/credentialing/${actualId}/documents`, formData)
            setDocuments(prev => [...prev, response.data])
            setUploadFile(null)
            setUploadDocumentType('npi')
            setUploadStatus('pending')
            setUploadVerificationId('')
            setUploadInsurancePolicyId('')
            setUploadPayerEnrollmentId('')
            setUploadIssueDate('')
            setUploadExpirationDate('')
            setUploadNotes('')
            const fileInput = document.getElementById('credentialing-document-file-input')
            if (fileInput) fileInput.value = ''
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setUploadError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to upload document'))
        } finally {
            setUploading(false)
        }
    }

    const handleDownload = async (doc) => {
        try {
            const response = await crmInstance.get(`/medical-billing/credentialing-documents/${doc.id}/download`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', doc.file_name)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to download document.', icon: 'error' })
        }
    }

    const handleDeleteDocument = async (doc) => {
        const result = await Swal.fire({
            title: 'Delete Document',
            text: `Are you sure you want to delete "${doc.file_name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/credentialing-documents/${doc.id}`)
            setDocuments(prev => prev.filter(d => d.id !== doc.id))
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete document.', icon: 'error' })
        }
    }

    const [editingDocId, setEditingDocId] = useState(null)
    const [editDocForm, setEditDocForm] = useState({ document_type: '', status: 'pending', issue_date: '', expiration_date: '', notes: '' })
    const [savingDocEdit, setSavingDocEdit] = useState(false)
    const [replacingDocId, setReplacingDocId] = useState(null)

    const startEditDocument = (doc) => {
        setEditingDocId(doc.id)
        setEditDocForm({
            document_type: doc.document_type || '',
            status: doc.status || 'pending',
            issue_date: doc.issue_date || '',
            expiration_date: doc.expiration_date || '',
            notes: doc.notes || '',
        })
    }
    const cancelEditDocument = () => setEditingDocId(null)

    const saveEditDocument = async (docId) => {
        setSavingDocEdit(true)
        try {
            const response = await crmInstance.put(`/medical-billing/credentialing-documents/${docId}`, editDocForm)
            setDocuments(prev => prev.map(d => d.id === docId ? response.data : d))
            setEditingDocId(null)
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to update document.', icon: 'error' })
        } finally {
            setSavingDocEdit(false)
        }
    }

    const handleReplaceFile = async (doc, file) => {
        if (!file) return
        setReplacingDocId(doc.id)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const response = await crmInstance.post(`/medical-billing/credentialing-documents/${doc.id}/replace`, formData)
            setDocuments(prev => prev.map(d => d.id === doc.id ? response.data : d))
            Swal.fire({ title: 'Replaced!', text: 'The file has been replaced.', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to replace file.', icon: 'error' })
        } finally {
            setReplacingDocId(null)
        }
    }

    const handlePolicyFieldChange = (field, value) => {
        setPolicyForm(prev => ({ ...prev, [field]: value }))
    }

    const handleAddPolicy = async (e) => {
        e.preventDefault()
        setSavingPolicy(true)
        setPolicyError('')
        try {
            const payload = {
                insurance_company: policyForm.insurance_company,
                policy_type: policyForm.policy_type || null,
                policy_number: policyForm.policy_number || null,
                effective_date: policyForm.effective_date || null,
                expiration_date: policyForm.expiration_date || null,
                coverage_limit: policyForm.coverage_limit || null,
                status: policyForm.status,
                notes: policyForm.notes || null,
            }
            const response = await crmInstance.post(`/medical-billing/credentialing/${actualId}/insurance-policies`, payload)
            setInsurancePolicies(prev => [...prev, response.data])
            setPolicyForm({ ...emptyPolicyForm })
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setPolicyError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to add insurance policy'))
        } finally {
            setSavingPolicy(false)
        }
    }

    const handleDeletePolicy = async (policy) => {
        const result = await Swal.fire({
            title: 'Delete Insurance Policy',
            text: `Are you sure you want to delete "${policy.insurance_company}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/credentialing/${actualId}/insurance-policies/${policy.id}`)
            setInsurancePolicies(prev => prev.filter(p => p.id !== policy.id))
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete insurance policy.', icon: 'error' })
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                provider_id: providerId,
                status,
                psv_status: psvStatus,
                psv_completed_date: psvCompletedDate || null,
                effective_date: effectiveDate || null,
                expiration_date: expirationDate || null,
                notes: notes || null,
                verifications: verifications.map(v => ({
                    type: v.type,
                    status: v.status,
                    verified_date: v.verified_date || null,
                    expiration_date: v.expiration_date || null,
                    source: v.source || null,
                    notes: v.notes || null,
                })),
                tasks: tasks.map(t => ({
                    title: t.title,
                    assignee: t.assignee || null,
                    due_date: t.due_date || null,
                    status: t.status,
                })),
                payer_enrollments: payerEnrollments
                    .filter(p => p.payer_id)
                    .map(p => ({
                        payer_id: p.payer_id,
                        status: p.status,
                        enrollment_type: p.enrollment_type || null,
                        payer_provider_id: p.payer_provider_id || null,
                        contract_number: p.contract_number || null,
                        applied_date: p.applied_date || null,
                        approved_date: p.approved_date || null,
                        effective_date: p.effective_date || null,
                        expiration_date: p.expiration_date || null,
                        follow_up_due_date: p.follow_up_due_date || null,
                        last_follow_up_date: p.last_follow_up_date || null,
                        next_follow_up_date: p.next_follow_up_date || null,
                        follow_up_notes: p.follow_up_notes || null,
                        assigned_to: p.assigned_to || null,
                        notes: p.notes || null,
                    })),
            }

            const response = await crmInstance.put(`/medical-billing/credentialing/${actualId}`, payload)
            if (response.status === 200) {
                setSavedVerifications(Array.isArray(response.data.verifications) ? response.data.verifications : [])
                setSavedPayerEnrollments(Array.isArray(response.data.payer_enrollments) ? response.data.payer_enrollments : [])
                Swal.fire({
                    title: 'Success!',
                    text: 'Credentialing record updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/credentialing')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '))
            } else {
                setError(err.response?.data?.message || 'Failed to update credentialing record')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_credentialing.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row g-4'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                                    <FiShield /> Edit Credentialing Record
                                </h2>
                            </div>
                        </div>
                    </div>

                    {isFetching ? (
                        <div className="col-lg-12">
                            <div className="card border-0" style={{ borderRadius: '20px' }}>
                                <div className="card-body d-flex justify-content-center py-5">
                                    <Spinner label="Loading credentialing record..." variant="spinner" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="col-lg-12">
                            <div className="card border-0" style={{ borderRadius: '20px' }}>
                                <div className="card-header bg-transparent overflow-auto">
                                    <ul className="nav nav-tabs flex-nowrap text-nowrap" style={{ border: 'none' }}>
                                        {TABS.map(tab => (
                                            <li className="nav-item" key={tab.key}>
                                                <button
                                                    type="button"
                                                    className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                                                    onClick={() => setActiveTab(tab.key)}
                                                >
                                                    {tab.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="card-body">
                                    {error && <div className="alert alert-danger">{error}</div>}

                                    {['overview', 'verifications', 'tasks', 'enrollments'].includes(activeTab) && (
                                        <form onSubmit={handleSubmit}>
                                            {activeTab === 'overview' && (
                                                <div className="tab-pane fade show active">
                                                    <div className="row g-4">
                                                        <div className="col-md-6">
                                                            <label className="form-label">Provider <span className="text-danger">*</span></label>
                                                            <select className="form-select" value={providerId} onChange={(e) => setProviderId(e.target.value)} required disabled={isLoading}>
                                                                <option value="">Select provider</option>
                                                                {providers.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.npi ? ` — NPI ${p.npi}` : ''}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="form-label">Overall Status</label>
                                                            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isLoading}>
                                                                {CREDENTIALING_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="form-label">PSV Status</label>
                                                            <select className="form-select" value={psvStatus} onChange={(e) => setPsvStatus(e.target.value)} disabled={isLoading}>
                                                                {PSV_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="form-label">PSV Completed Date</label>
                                                            <input type="date" className="form-control" value={psvCompletedDate} onChange={(e) => setPsvCompletedDate(e.target.value)} disabled={isLoading} />
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="form-label">Effective Date</label>
                                                            <input type="date" className="form-control" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} disabled={isLoading} />
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="form-label">Expiration Date</label>
                                                            <input type="date" className="form-control" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} disabled={isLoading} />
                                                        </div>
                                                        <div className="col-md-12">
                                                            <label className="form-label">Notes</label>
                                                            <textarea className="form-control" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLoading} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'verifications' && (
                                                <div className="tab-pane fade show active">
                                                    {verifications.map((v, index) => (
                                                        <div key={index} className="border rounded p-3 mb-3">
                                                            <div className="row g-3">
                                                                <div className="col-md-3">
                                                                    <label className="form-label">Type</label>
                                                                    <select className="form-select" value={v.type} onChange={(e) => updateVerification(index, 'type', e.target.value)} disabled={isLoading}>
                                                                        {VERIFICATION_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Status</label>
                                                                    <select className="form-select" value={v.status} onChange={(e) => updateVerification(index, 'status', e.target.value)} disabled={isLoading}>
                                                                        {VERIFICATION_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Verified Date</label>
                                                                    <input type="date" className="form-control" value={v.verified_date} onChange={(e) => updateVerification(index, 'verified_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Expiration Date</label>
                                                                    <input type="date" className="form-control" value={v.expiration_date} onChange={(e) => updateVerification(index, 'expiration_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Source</label>
                                                                    <input type="text" className="form-control" placeholder="e.g. NPPES" value={v.source} onChange={(e) => updateVerification(index, 'source', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-1 d-flex align-items-end">
                                                                    {verifications.length > 1 && (
                                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeVerification(index)} disabled={isLoading}>
                                                                            <FiTrash2 />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="col-md-12">
                                                                    <label className="form-label">Notes</label>
                                                                    <textarea className="form-control" rows={2} value={v.notes} onChange={(e) => updateVerification(index, 'notes', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addVerification} disabled={isLoading}>
                                                        <FiPlus className="me-1" /> Add Verification
                                                    </button>
                                                </div>
                                            )}

                                            {activeTab === 'tasks' && (
                                                <div className="tab-pane fade show active">
                                                    {tasks.map((t, index) => (
                                                        <div key={index} className="border rounded p-3 mb-3">
                                                            <div className="row g-3">
                                                                <div className="col-md-4">
                                                                    <label className="form-label">Task <span className="text-danger">*</span></label>
                                                                    <input type="text" className="form-control" placeholder="e.g. Request malpractice insurance certificate" value={t.title} onChange={(e) => updateTask(index, 'title', e.target.value)} required disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label">Assignee</label>
                                                                    <input type="text" className="form-control" value={t.assignee} onChange={(e) => updateTask(index, 'assignee', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Due Date</label>
                                                                    <input type="date" className="form-control" value={t.due_date} onChange={(e) => updateTask(index, 'due_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Status</label>
                                                                    <select className="form-select" value={t.status} onChange={(e) => updateTask(index, 'status', e.target.value)} disabled={isLoading}>
                                                                        {TASK_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-1 d-flex align-items-end">
                                                                    {tasks.length > 1 && (
                                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeTask(index)} disabled={isLoading}>
                                                                            <FiTrash2 />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addTask} disabled={isLoading}>
                                                        <FiPlus className="me-1" /> Add Task
                                                    </button>
                                                </div>
                                            )}

                                            {activeTab === 'enrollments' && (
                                                <div className="tab-pane fade show active">
                                                    {payerEnrollments.map((p, index) => (
                                                        <div key={index} className="border rounded p-3 mb-3">
                                                            <div className="row g-3">
                                                                <div className="col-md-3">
                                                                    <label className="form-label">Payer</label>
                                                                    <select className="form-select" value={p.payer_id} onChange={(e) => updatePayerEnrollment(index, 'payer_id', e.target.value)} disabled={isLoading}>
                                                                        <option value="">Select payer</option>
                                                                        {payers.map(payer => <option key={payer.id} value={payer.id}>{payer.name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Status</label>
                                                                    <select className="form-select" value={p.status} onChange={(e) => updatePayerEnrollment(index, 'status', e.target.value)} disabled={isLoading}>
                                                                        {PAYER_ENROLLMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Enrollment Type</label>
                                                                    <input type="text" className="form-control" placeholder="e.g. Individual" value={p.enrollment_type} onChange={(e) => updatePayerEnrollment(index, 'enrollment_type', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Payer Provider ID</label>
                                                                    <input type="text" className="form-control" value={p.payer_provider_id} onChange={(e) => updatePayerEnrollment(index, 'payer_provider_id', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Contract Number</label>
                                                                    <input type="text" className="form-control" value={p.contract_number} onChange={(e) => updatePayerEnrollment(index, 'contract_number', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-1 d-flex align-items-end">
                                                                    {payerEnrollments.length > 1 && (
                                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removePayerEnrollment(index)} disabled={isLoading}>
                                                                            <FiTrash2 />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Applied Date</label>
                                                                    <input type="date" className="form-control" value={p.applied_date} onChange={(e) => updatePayerEnrollment(index, 'applied_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Approved Date</label>
                                                                    <input type="date" className="form-control" value={p.approved_date} onChange={(e) => updatePayerEnrollment(index, 'approved_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Effective Date</label>
                                                                    <input type="date" className="form-control" value={p.effective_date} onChange={(e) => updatePayerEnrollment(index, 'effective_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-2">
                                                                    <label className="form-label">Expiration Date</label>
                                                                    <input type="date" className="form-control" value={p.expiration_date} onChange={(e) => updatePayerEnrollment(index, 'expiration_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-4">
                                                                    <label className="form-label">Assigned Team Member</label>
                                                                    <select className="form-select" value={p.assigned_to} onChange={(e) => updatePayerEnrollment(index, 'assigned_to', e.target.value)} disabled={isLoading}>
                                                                        <option value="">Unassigned</option>
                                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label">Follow-up Due Date</label>
                                                                    <input type="date" className="form-control" value={p.follow_up_due_date} onChange={(e) => updatePayerEnrollment(index, 'follow_up_due_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label">Last Follow-up</label>
                                                                    <input type="date" className="form-control" value={p.last_follow_up_date} onChange={(e) => updatePayerEnrollment(index, 'last_follow_up_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label">Next Follow-up</label>
                                                                    <input type="date" className="form-control" value={p.next_follow_up_date} onChange={(e) => updatePayerEnrollment(index, 'next_follow_up_date', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <label className="form-label">Follow-up Notes</label>
                                                                    <textarea className="form-control" rows={2} value={p.follow_up_notes} onChange={(e) => updatePayerEnrollment(index, 'follow_up_notes', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <label className="form-label">Notes</label>
                                                                    <textarea className="form-control" rows={2} value={p.notes} onChange={(e) => updatePayerEnrollment(index, 'notes', e.target.value)} disabled={isLoading} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addPayerEnrollment} disabled={isLoading}>
                                                        <FiPlus className="me-1" /> Add Payer Enrollment
                                                    </button>
                                                </div>
                                            )}

                                            <div className="text-center mt-4 d-flex gap-3 justify-content-center">
                                                <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                                    {isLoading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Updating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiSave className="me-2" />
                                                            Update Credentialing Record
                                                        </>
                                                    )}
                                                </button>
                                                <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/credentialing')} disabled={isLoading}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {activeTab === 'documents' && (
                                        <div className="tab-pane fade show active">
                                            <form onSubmit={handleUpload} className="border rounded p-3 mb-4">
                                                {uploadError && <div className="alert alert-danger py-2">{uploadError}</div>}
                                                <div className="row g-3">
                                                    <div className="col-md-3">
                                                        <label className="form-label">File <span className="text-danger">*</span></label>
                                                        <input id="credentialing-document-file-input" type="file" className="form-control" onChange={(e) => setUploadFile(e.target.files[0])} required disabled={uploading} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Type</label>
                                                        <select className="form-select" value={uploadDocumentType} onChange={(e) => setUploadDocumentType(e.target.value)} disabled={uploading}>
                                                            {DOCUMENT_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Status</label>
                                                        <select className="form-select" value={uploadStatus} onChange={(e) => setUploadStatus(e.target.value)} disabled={uploading}>
                                                            {DOCUMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label">Linked Verification</label>
                                                        <select className="form-select" value={uploadVerificationId} onChange={(e) => setUploadVerificationId(e.target.value)} disabled={uploading}>
                                                            <option value="">None</option>
                                                            {savedVerifications.map(v => <option key={v.id} value={v.id}>{v.type}</option>)}
                                                        </select>
                                                        <div className="form-text">Only already-saved verifications can be linked.</div>
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Linked Insurance Policy</label>
                                                        <select className="form-select" value={uploadInsurancePolicyId} onChange={(e) => setUploadInsurancePolicyId(e.target.value)} disabled={uploading}>
                                                            <option value="">None</option>
                                                            {insurancePolicies.map(p => <option key={p.id} value={p.id}>{p.insurance_company}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Linked Payer Enrollment</label>
                                                        <select className="form-select" value={uploadPayerEnrollmentId} onChange={(e) => setUploadPayerEnrollmentId(e.target.value)} disabled={uploading}>
                                                            <option value="">None</option>
                                                            {savedPayerEnrollments.map(pe => <option key={pe.id} value={pe.id}>{pe.payer?.name || `Enrollment #${pe.id}`}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Issue Date</label>
                                                        <input type="date" className="form-control" value={uploadIssueDate} onChange={(e) => setUploadIssueDate(e.target.value)} disabled={uploading} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Expiration Date</label>
                                                        <input type="date" className="form-control" value={uploadExpirationDate} onChange={(e) => setUploadExpirationDate(e.target.value)} disabled={uploading} />
                                                    </div>
                                                    <div className="col-md-2 d-flex align-items-end">
                                                        <button type="submit" className="btn btn-primary w-100" disabled={uploading || !uploadFile}>
                                                            {uploading ? (
                                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                            ) : (
                                                                <><FiUpload className="me-1" /> Upload</>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <label className="form-label">Notes</label>
                                                        <textarea className="form-control" rows={2} value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} disabled={uploading} />
                                                    </div>
                                                </div>
                                            </form>

                                            {documents.length === 0 ? (
                                                <p className="text-muted small">No documents uploaded yet.</p>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover">
                                                        <thead>
                                                            <tr>
                                                                <th>File</th>
                                                                <th>Type</th>
                                                                <th>Status</th>
                                                                <th>Linked Verification</th>
                                                                <th>Linked Payer Enrollment</th>
                                                                <th>Issue Date</th>
                                                                <th>Expiration Date</th>
                                                                <th>Uploaded By</th>
                                                                <th className="text-end" style={{ position: 'sticky', right: 0, zIndex: 2, backgroundColor: '#fff' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {documents.map(doc => (
                                                                editingDocId === doc.id ? (
                                                                    <tr key={doc.id}>
                                                                        <td>{doc.file_name}</td>
                                                                        <td>
                                                                            <select className="form-select form-select-sm" value={editDocForm.document_type} onChange={(e) => setEditDocForm(prev => ({ ...prev, document_type: e.target.value }))} disabled={savingDocEdit}>
                                                                                {DOCUMENT_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                            </select>
                                                                        </td>
                                                                        <td>
                                                                            <select className="form-select form-select-sm" value={editDocForm.status} onChange={(e) => setEditDocForm(prev => ({ ...prev, status: e.target.value }))} disabled={savingDocEdit}>
                                                                                {DOCUMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                            </select>
                                                                        </td>
                                                                        <td>{doc.verification?.type || '—'}</td>
                                                                        <td>{doc.payer_enrollment?.payer?.name || '—'}</td>
                                                                        <td>
                                                                            <input type="date" className="form-control form-control-sm" value={editDocForm.issue_date} onChange={(e) => setEditDocForm(prev => ({ ...prev, issue_date: e.target.value }))} disabled={savingDocEdit} />
                                                                        </td>
                                                                        <td>
                                                                            <input type="date" className="form-control form-control-sm" value={editDocForm.expiration_date} onChange={(e) => setEditDocForm(prev => ({ ...prev, expiration_date: e.target.value }))} disabled={savingDocEdit} />
                                                                        </td>
                                                                        <td>{doc.uploaded_by?.name || '—'}</td>
                                                                        <td className="text-end" style={{ position: 'sticky', right: 0, zIndex: 1, backgroundColor: '#fff' }}>
                                                                            <div className="hstack gap-2 justify-content-end">
                                                                                <button type="button" className="avatar-text avatar-md" title="Save" onClick={() => saveEditDocument(doc.id)} disabled={savingDocEdit}>
                                                                                    <FiSave />
                                                                                </button>
                                                                                <button type="button" className="avatar-text avatar-md" title="Cancel" onClick={cancelEditDocument} disabled={savingDocEdit}>
                                                                                    <FiX />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    <tr key={doc.id}>
                                                                        <td>{doc.file_name}</td>
                                                                        <td className="text-capitalize">{(doc.document_type || '').replace(/_/g, ' ')}</td>
                                                                        <td>
                                                                            <span className={`badge bg-soft-${STATUS_BADGE[doc.status] || 'secondary'} text-${STATUS_BADGE[doc.status] || 'secondary'} text-capitalize`}>
                                                                                {doc.status || 'pending'}
                                                                            </span>
                                                                        </td>
                                                                        <td>{doc.verification?.type || '—'}</td>
                                                                        <td>{doc.payer_enrollment?.payer?.name || '—'}</td>
                                                                        <td>{doc.issue_date || '—'}</td>
                                                                        <td>
                                                                            {doc.expiration_date ? (
                                                                                <div className="d-flex flex-column gap-1">
                                                                                    <span>{doc.expiration_date}</span>
                                                                                    {getExpiryStatus(doc.expiration_date) !== 'active' && (
                                                                                        <span className={`badge bg-soft-${EXPIRY_STATUS_BADGE[getExpiryStatus(doc.expiration_date)]} text-${EXPIRY_STATUS_BADGE[getExpiryStatus(doc.expiration_date)]}`}>
                                                                                            {EXPIRY_STATUS_LABELS[getExpiryStatus(doc.expiration_date)]}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : 'N/A'}
                                                                        </td>
                                                                        <td>{doc.uploaded_by?.name || '—'}</td>
                                                                        <td className="text-end" style={{ position: 'sticky', right: 0, zIndex: 1, backgroundColor: '#fff' }}>
                                                                            <div className="hstack gap-2 justify-content-end">
                                                                                <button type="button" className="avatar-text avatar-md" title="Edit metadata" onClick={() => startEditDocument(doc)}>
                                                                                    <FiEdit3 />
                                                                                </button>
                                                                                <label className="avatar-text avatar-md mb-0" title="Replace file" style={{ cursor: replacingDocId === doc.id ? 'wait' : 'pointer' }}>
                                                                                    {replacingDocId === doc.id ? (
                                                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                                                    ) : (
                                                                                        <FiRefreshCw />
                                                                                    )}
                                                                                    <input type="file" hidden disabled={replacingDocId === doc.id} onChange={(e) => handleReplaceFile(doc, e.target.files[0])} />
                                                                                </label>
                                                                                <button type="button" className="avatar-text avatar-md" title="Download" onClick={() => handleDownload(doc)}>
                                                                                    <FiDownload />
                                                                                </button>
                                                                                <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDeleteDocument(doc)}>
                                                                                    <FiTrash2 />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'policies' && (
                                        <div className="tab-pane fade show active">
                                            <form onSubmit={handleAddPolicy} className="border rounded p-3 mb-4">
                                                {policyError && <div className="alert alert-danger py-2">{policyError}</div>}
                                                <div className="row g-3">
                                                    <div className="col-md-3">
                                                        <label className="form-label">Insurance Company <span className="text-danger">*</span></label>
                                                        <input type="text" className="form-control" value={policyForm.insurance_company} onChange={(e) => handlePolicyFieldChange('insurance_company', e.target.value)} required disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Policy Type</label>
                                                        <input type="text" className="form-control" placeholder="e.g. Malpractice" value={policyForm.policy_type} onChange={(e) => handlePolicyFieldChange('policy_type', e.target.value)} disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Policy Number</label>
                                                        <input type="text" className="form-control" value={policyForm.policy_number} onChange={(e) => handlePolicyFieldChange('policy_number', e.target.value)} disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Effective Date</label>
                                                        <input type="date" className="form-control" value={policyForm.effective_date} onChange={(e) => handlePolicyFieldChange('effective_date', e.target.value)} disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Expiration Date</label>
                                                        <input type="date" className="form-control" value={policyForm.expiration_date} onChange={(e) => handlePolicyFieldChange('expiration_date', e.target.value)} disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Coverage / Limit</label>
                                                        <input type="number" step="0.01" className="form-control" value={policyForm.coverage_limit} onChange={(e) => handlePolicyFieldChange('coverage_limit', e.target.value)} disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Status</label>
                                                        <select className="form-select" value={policyForm.status} onChange={(e) => handlePolicyFieldChange('status', e.target.value)} disabled={savingPolicy}>
                                                            {INSURANCE_POLICY_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label">Notes</label>
                                                        <textarea className="form-control" rows={2} value={policyForm.notes} onChange={(e) => handlePolicyFieldChange('notes', e.target.value)} disabled={savingPolicy} />
                                                    </div>
                                                    <div className="col-md-2 d-flex align-items-end">
                                                        <button type="submit" className="btn btn-primary w-100" disabled={savingPolicy}>
                                                            {savingPolicy ? (
                                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                            ) : (
                                                                <><FiPlus className="me-1" /> Add Policy</>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>

                                            {insurancePolicies.length === 0 ? (
                                                <p className="text-muted small">No insurance policies on file.</p>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover">
                                                        <thead>
                                                            <tr>
                                                                <th>Insurance Company</th>
                                                                <th>Policy Type</th>
                                                                <th>Policy Number</th>
                                                                <th>Effective Date</th>
                                                                <th>Expiration Date</th>
                                                                <th>Coverage Limit</th>
                                                                <th>Status</th>
                                                                <th className="text-end" style={{ position: 'sticky', right: 0, zIndex: 2, backgroundColor: '#fff' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {insurancePolicies.map(policy => (
                                                                <tr key={policy.id}>
                                                                    <td>{policy.insurance_company}</td>
                                                                    <td className="text-capitalize">{policy.policy_type || '—'}</td>
                                                                    <td>{policy.policy_number || '—'}</td>
                                                                    <td>{policy.effective_date || '—'}</td>
                                                                    <td>
                                                                        {policy.expiration_date ? (
                                                                            <div className="d-flex flex-column gap-1">
                                                                                <span>{policy.expiration_date}</span>
                                                                                {getExpiryStatus(policy.expiration_date) !== 'active' && (
                                                                                    <span className={`badge bg-soft-${EXPIRY_STATUS_BADGE[getExpiryStatus(policy.expiration_date)]} text-${EXPIRY_STATUS_BADGE[getExpiryStatus(policy.expiration_date)]}`}>
                                                                                        {EXPIRY_STATUS_LABELS[getExpiryStatus(policy.expiration_date)]}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : 'N/A'}
                                                                    </td>
                                                                    <td>{policy.coverage_limit || '—'}</td>
                                                                    <td>
                                                                        <span className={`badge bg-soft-${STATUS_BADGE[policy.status] || 'secondary'} text-${STATUS_BADGE[policy.status] || 'secondary'} text-capitalize`}>
                                                                            {policy.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-end" style={{ position: 'sticky', right: 0, zIndex: 1, backgroundColor: '#fff' }}>
                                                                        <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDeletePolicy(policy)}>
                                                                            <FiTrash2 />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
