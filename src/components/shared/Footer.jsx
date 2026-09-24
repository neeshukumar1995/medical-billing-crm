'use client'
import React, { useContext } from 'react'
import { FiFileText } from 'react-icons/fi'
import { StickyNotesContext } from '@/contentApi/stickyNotesProvider'

const Footer = () => {
    const { addNote } = useContext(StickyNotesContext)

    return (
        <footer className="footer">
            <p className="fs-11 text-muted fw-medium text-uppercase mb-0 copyright">
                <span>Copyright ©</span>
                {new Date().getFullYear()}
            </p>
            <div className="d-flex align-items-center gap-4">
                <button type="button" className="btn btn-link p-0 text-muted" title="Sticky Notes" onClick={addNote}>
                    <FiFileText size={16} />
                </button>
                <a href="#" className="fs-11 fw-semibold text-uppercase">Help</a>
                <a href="#" className="fs-11 fw-semibold text-uppercase">Terms</a>
                <a href="#" className="fs-11 fw-semibold text-uppercase">Privacy</a>
            </div>
        </footer>
    )
}

export default Footer