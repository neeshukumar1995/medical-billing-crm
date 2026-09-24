'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiFileText, FiX, FiCheckCircle, FiSend } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
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

export default function ClaimModal({ claimId, onClose, onSaved }) {
    const { hasPermission } = usePermissions()

    const [claim, setClaim] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchClaim = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get(`/medical-billing/claims/${claimId}`)
            setClaim(response.data)
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load claim.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (claimId) fetchClaim()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claimId])

    const handleValidate = async () => {
        try {
            const { data } = await crmInstance.post(`/medical-billing/claims/${claimId}/validate`)
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
            await crmInstance.post(`/medical-billing/claims/${claimId}/submit`)
            Swal.fire({ title: 'Submitted!', icon: 'success', timer: 1500, showConfirmButton: false })
            await fetchClaim()
            onSaved && onSaved()
        } catch (err) {
            const issues = err.response?.data?.issues
            const issuesHtml = issues ? '<ul style="text-align:left">' + issues.map(i => `<li><b>[${i.severity}]</b> ${i.message}</li>`).join('') + '</ul>' : ''
            Swal.fire({ title: 'Cannot submit', html: (err.response?.data?.message || '') + issuesHtml, icon: 'error' })
        }
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiFileText />
                                Claim Details
                            </h5>
                            <div className="d-flex align-items-center gap-2">
                                {claim && claim.status !== 'submitted' && hasPermission('medical_claims.view') && (
                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleValidate}>
                                        <FiCheckCircle className="me-1" /> Validate
                                    </button>
                                )}
                                {claim && claim.status === 'draft' && hasPermission('medical_claims.submit') && (
                                    <button type="button" className="btn btn-sm btn-primary" onClick={handleSubmit}>
                                        <FiSend className="me-1" /> Submit
                                    </button>
                                )}
                                <button type="button" className="btn-close" onClick={onClose} />
                            </div>
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading claim..." variant="spinner" />
                                </div>
                            ) : claim ? (
                                <>
                                    <h4 className="fw-bold d-flex align-items-center gap-2">
                                        {claim.claim_number}
                                        <span className={`badge bg-soft-${STATUS_COLORS[claim.status] || 'secondary'} text-${STATUS_COLORS[claim.status] || 'secondary'} text-capitalize`}>
                                            {claim.status?.replace('_', ' ')}
                                        </span>
                                    </h4>

                                    <div className="row g-4 mb-3">
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

                                    <hr />
                                    <h6 className="mb-3">Service Lines</h6>
                                    <div className="table-responsive mb-4">
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

                                    <hr />
                                    <h6 className="mb-3">Status History</h6>
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
                                </>
                            ) : null}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                <FiX className="me-2" />
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}
