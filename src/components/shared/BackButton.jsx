'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft } from 'react-icons/fi'
import { HOME_PATH } from '@/constants/portalScope'

/**
 * Goes back to the previous page. When there is no in-app history (page
 * opened directly, new tab, bookmark) it goes to `fallback` — the dashboard
 * by default, since a URL's parent path often isn't a real page
 * (e.g. /patients/edit/12 -> /patients/edit).
 */
const BackButton = ({ fallback = HOME_PATH, className = '', label = 'Back' }) => {
    const router = useRouter()

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(fallback)
        }
    }

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`btn btn-sm btn-light d-inline-flex align-items-center gap-1 ${className}`}
            title="Go back"
        >
            <FiArrowLeft size={16} />
            <span className="d-none d-sm-inline">{label}</span>
        </button>
    )
}

export default BackButton
