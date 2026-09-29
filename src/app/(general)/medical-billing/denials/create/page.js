'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiAlertCircle } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const page = () => {
    const router = useRouter()
    const [claimId, setClaimId] = useState('')
    const [denialCode, setDenialCode] = useState('')
    const [reason, setReason] = useState('')
    const [denialDate, setDenialDate] = useState('')
    const [assignedTo, setAssignedTo] = useState('')

    const [claims, setClaims] = useState([])
    const [users, setUsers] = useState([])

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const rawCid = localStorage.getItem('companyId')
                const cid = rawCid ? JSON.parse(rawCid) : null
                const [claimsRes, usersRes] = await Promise.all([
                    crmInstance.get('/medical-billing/claims', { params: { per_page: 500 } }),
                    cid ? crmInstance.get(`/users/${cid}`, { params: { limit: 1000 } }) : Promise.resolve({ data: {} }),
                ])
                setClaims(claimsRes.data?.data || [])
                const userList = usersRes.data?.data?.data || usersRes.data?.data || []
                setUsers(Array.isArray(userList) ? userList : [])
            } catch {
                // dropdowns stay empty
            }
        })()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.post('/medical-billing/denials', {
                claim_id: claimId,
                denial_code: denialCode || null,
                reason,
                denial_date: denialDate || null,
                assigned_to: assignedTo || null,
            })
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!', text: 'Denial logged — the claim status has been updated to Denied.', icon: 'success',
                    confirmButtonText: 'OK', confirmButtonColor: '#007bff'
                }).then(() => router.push('/medical-billing/denials'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to log denial'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_denials.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FiAlertCircle /> Log Denial
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Claim <span className="text-danger">*</span></label>
                                            <select className="form-select" value={claimId} onChange={(e) => setClaimId(e.target.value)} required disabled={isLoading}>
                                                <option value="">Select claim</option>
                                                {claims.map(c => <option key={c.id} value={c.id}>{c.claim_number} — {c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : ''}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Denial Code</label>
                                            <input type="text" className="form-control" placeholder="e.g. CO-97" value={denialCode} onChange={(e) => setDenialCode(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Denial Date</label>
                                            <input type="date" className="form-control" value={denialDate} onChange={(e) => setDenialDate(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Reason <span className="text-danger">*</span></label>
                                            <textarea className="form-control" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Assign To</label>
                                            <select className="form-select" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isLoading}>
                                                <option value="">Unassigned</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="text-center mt-5">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Log Denial
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
