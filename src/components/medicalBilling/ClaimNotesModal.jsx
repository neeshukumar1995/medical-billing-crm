'use client'
import React from 'react'
import ClaimNotes from './ClaimNotes'

const ClaimNotesModal = ({ claim, onClose }) => {
    if (!claim) return null

    return (
        <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1060 }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content shadow-lg border-0" style={{ borderRadius: '16px' }}>
                    <div className="modal-header">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <span>Claim Notes &amp; Follow-ups:</span>
                            <span className="text-primary fw-bold">{claim.claim_number}</span>
                            {claim.patient && (
                                <span className="fs-12 text-muted">
                                    ({claim.patient.first_name} {claim.patient.last_name})
                                </span>
                            )}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                        />
                    </div>
                    <div className="modal-body p-3">
                        <ClaimNotes claimId={claim.id} initialNotes={claim.notes} />
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ClaimNotesModal

