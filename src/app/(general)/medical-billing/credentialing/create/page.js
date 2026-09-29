'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useSearchParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiShield, FiPlus, FiTrash2 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { encryptId } from '@/utils/encryptId'
import {
    CREDENTIALING_STATUS_OPTIONS,
    PSV_STATUS_OPTIONS,
    VERIFICATION_TYPE_OPTIONS,
    VERIFICATION_STATUS_OPTIONS,
    TASK_STATUS_OPTIONS,
    PAYER_ENROLLMENT_STATUS_OPTIONS,
} from '@/constants/credentialingOptions'

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
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState('overview')
    const [providerId, setProviderId] = useState(searchParams.get('provider_id') || '')
    const [status, setStatus] = useState('in_progress')
    const [psvStatus, setPsvStatus] = useState('pending')
    const [psvCompletedDate, setPsvCompletedDate] = useState('')
    const [effectiveDate, setEffectiveDate] = useState('')
    const [expirationDate, setExpirationDate] = useState('')
    const [notes, setNotes] = useState('')
    const [verifications, setVerifications] = useState([{ ...emptyVerification }])
    const [tasks, setTasks] = useState([{ ...emptyTask }])
    const [payerEnrollments, setPayerEnrollments] = useState([{ ...emptyPayerEnrollment }])

    const [providers, setProviders] = useState([])
    const [payers, setPayers] = useState([])
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

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

            const response = await crmInstance.post('/medical-billing/credentialing', payload)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Credentialing record created. You can now attach documents to it.',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push(`/medical-billing/credentialing/edit/${encryptId(response.data.id)}`)
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '))
            } else {
                setError(err.response?.data?.message || 'Failed to create credentialing record')
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
                                    <FiShield /> New Credentialing Record
                                </h2>
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

                                    {activeTab === 'documents' && (
                                        <div className="tab-pane fade show active">
                                            <div className="alert alert-info mb-0">
                                                Save the record first — once it's created you'll be taken to the edit page where you can upload documents.
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'policies' && (
                                        <div className="tab-pane fade show active">
                                            <div className="alert alert-info mb-0">
                                                Save the record first — once it's created you'll be taken to the edit page where you can add liability policies.
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-center mt-4">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Create Credentialing Record
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
