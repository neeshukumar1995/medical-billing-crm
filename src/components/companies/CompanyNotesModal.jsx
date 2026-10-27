'use client'
import React from 'react'
import { FiX, FiBriefcase } from 'react-icons/fi'
import CompanyNotes from './CompanyNotes'

const CompanyNotesModal = ({ company, onClose }) => {
    if (!company) return null

    return (
        <>
            <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiBriefcase className="text-primary" />
                                {company.name} — Notes
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body p-3">
                            <CompanyNotes companyId={company.id} />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                <FiX className="me-1" /> Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
        </>
    )
}

export default CompanyNotesModal

