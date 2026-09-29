'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import { FiFileText, FiCheckCircle, FiSend } from 'react-icons/fi'
import Swal from 'sweetalert2'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { decryptId } from '@/utils/decryptId'
import { formatDateTime } from '@/utils/formatDate'

const STATUS_COLORS = {
    draft: 'secondary', ready: 'info', submitted: 'primary', accepted: 'success',
    rejected: 'danger', pending: 'warning', denied: 'danger',
    partially_paid: 'warning', paid: 'success', closed: 'secondary',
}

const Field = ({ label, value }) => (
    <div className="col-md-3">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])
    const { hasPermission } = usePermissions()

    const [claim, setClaim] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchClaim = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/claims/${actualId}`)
            setClaim(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load claim.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (actualId) fetchClaim() }, [actualId])

    const handleValidate = async () => {
        try {
            const { data } = await crmInstance.post(`/medical-billing/claims/${actualId}/validate`)
            const issuesHtml = data.issues.length
                ? '<ul style="text-align:left">' + data.issues.map(i => `<li><b>[${i.severity}]</b> ${i.message}</li>`).join('') + '</ul>'
                : '<p>No issues found.</p>'
            Swal.fire({ title: data.valid ? 'Ready to submit' : 'Blocking errors found', html: issuesHtml, icon: data.valid ? 'success' : 'error' })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Validation failed.', icon: 'error' })
        }
    }

    const handleSubmit = async () => {
        const result = await Swal.fire({
            title: 'Submit Claim', text: 'Submit this claim for processing?', icon: 'question',
            showCancelButton: true, confirmButtonText: 'Submit', confirmButtonColor: '#007bff'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.post(`/medical-billing/claims/${actualId}/submit`)
            Swal.fire({ title: 'Submitted!', icon: 'success', timer: 1500, showConfirmButton: false })
            fetchClaim()
        } catch (err) {
            const issues = err.response?.data?.issues
            const issuesHtml = issues ? '<ul style="text-align:left">' + issues.map(i => `<li><b>[${i.severity}]</b> ${i.message}</li>`).join('') + '</ul>' : ''
            Swal.fire({ title: 'Cannot submit', html: (err.response?.data?.message || '') + issuesHtml, icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_claims.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {claim && claim.status !== 'submitted' && hasPermission('medical_claims.view') && (
                        <button className="btn btn-outline-primary" onClick={handleValidate}>
                            <FiCheckCircle className="me-2" /> Validate
                        </button>
                    )}
                    {claim && claim.status === 'draft' && hasPermission('medical_claims.submit') && (
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            <FiSend className="me-2" /> Submit
                        </button>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        {error && <div className="alert alert-danger">{error}</div>}

                        {loading ? (
                            <div className="d-flex justify-content-center py-5">
                                <Spinner label="Loading claim..." variant="spinner" />
                            </div>
                        ) : claim ? (
                            <>
                                <div className="card shadow-lg border-0 mb-4" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                            <FiFileText /> {claim.claim_number}
                                            <span className={`badge bg-soft-${STATUS_COLORS[claim.status] || 'secondary'} text-${STATUS_COLORS[claim.status] || 'secondary'} text-capitalize ms-2`}>
                                                {claim.status?.replace('_', ' ')}
                                            </span>
                                        </h2>
                                    </div>
                                    <div className="card-body pt-0">
                                        <div className="row g-4">
                                            <Field label="Patient" value={claim.patient ? `${claim.patient.first_name} ${claim.patient.last_name}` : null} />
                                            <Field label="Provider" value={claim.provider ? `${claim.provider.first_name} ${claim.provider.last_name}` : null} />
                                            <Field label="Payer" value={claim.payer?.name || 'Self-pay'} />
                                            <Field label="Claim Type" value={claim.claim_type} />
                                            <Field label="Billing NPI" value={claim.billing_provider_npi} />
                                            <Field label="Total Charge" value={`$${Number(claim.total_charge).toFixed(2)}`} />
                                            <Field label="Total Paid" value={`$${Number(claim.total_paid).toFixed(2)}`} />
                                            <Field label="Patient Responsibility" value={`$${Number(claim.patient_responsibility).toFixed(2)}`} />
                                            <Field label="Submitted At" value={claim.submitted_at} />
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-lg border-0 mb-4" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <h5 className="mb-3">Service Lines</h5>
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>DOS</th>
                                                        <th>Code</th>
                                                        <th>Modifiers</th>
                                                        <th>Units</th>
                                                        <th>Amount</th>
                                                        <th>Dx Ptr</th>
                                                        <th>POS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(claim.items || []).map(item => (
                                                        <tr key={item.id}>
                                                            <td>{item.dos_from}</td>
                                                            <td>{item.cpt_hcpcs_code}</td>
                                                            <td>{item.modifiers || 'N/A'}</td>
                                                            <td>{item.units}</td>
                                                            <td>${Number(item.charge_amount).toFixed(2)}</td>
                                                            <td>{item.diagnosis_pointer || 'N/A'}</td>
                                                            <td>{item.place_of_service || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                                    <div className="card-body">
                                        <h5 className="mb-3">Status History</h5>
                                        <ul className="list-unstyled mb-0">
                                            {(claim.status_history || []).map(h => (
                                                <li key={h.id} className="mb-2 pb-2 border-bottom">
                                                    <span className="text-capitalize fw-semibold">{h.old_status || '—'} → {h.new_status}</span>
                                                    <span className="text-muted small ms-2">{formatDateTime(h.created_at)}</span>
                                                    {h.reason && <div className="text-muted small">{h.reason}</div>}
                                                    {h.changed_by && <div className="text-muted small">by {h.changed_by.name}</div>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
