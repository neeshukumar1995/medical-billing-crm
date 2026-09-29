'use client'
import React, { useState } from 'react'
import { FiAlignRight, FiArrowLeft } from 'react-icons/fi'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'

// Landing pages where "back" has nowhere sensible to go.
const NO_BACK_PATHS = ['/', '/dashboard']

// "purchase-orders" -> "Purchase Orders", "patient-payments" -> "Patient Payments"
const formatSegment = (segment) =>
    segment ? segment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : ""

// Route words ("list", "patients", "User-Follow-Ups") vs record ids — plain
// numbers or encrypted ids like "U2FsdGVk...%3D" — which must never show up
// in the breadcrumb.
const isWordSegment = (segment) => /^[A-Za-z][A-Za-z_-]*$/.test(segment) && segment.length <= 40

const PageHeader = ({ children }) => {
    const router = useRouter()
    const [openSidebar, setOpenSidebar] = useState(false)
    const pathName = usePathname()
    let folderName = ""
    let fileName = ""
    if (pathName === "/") {
        folderName = "Dashboard"
        fileName = "Dashboard"
    } else {
        folderName = pathName.split("/")[1]
        fileName = pathName.split("/")[2]
        // /clients/<encrypted id>/view — never show the id itself.
        if (fileName && !isWordSegment(fileName)) fileName = ""
    }
    return (
        <div className="page-header">
            <div className="page-header-left d-flex align-items-center">
                {!NO_BACK_PATHS.includes(pathName) && <BackButton className="me-3" />}
                <div className="page-header-title">
                    <h5 className="m-b-10 text-capitalize">{folderName}</h5>
                </div>
                <ul className="breadcrumb">
                    <li className="breadcrumb-item"><Link href="/">Home</Link></li>

                    {fileName && fileName !== folderName && (
                        <li className="breadcrumb-item active">{formatSegment(fileName)}</li>
                    )}
                </ul>
            </div>
            <div className="page-header-right ms-auto">
                <div className={`page-header-right-items ${openSidebar ? "page-header-right-open" : ""}`}>
                    <div className="d-flex d-md-none">
                        <Link href="#" onClick={() => setOpenSidebar(false)} className="page-header-right-close-toggle">
                            <FiArrowLeft size={16} className="me-2" />
                            <span>Back</span>
                        </Link>
                    </div>
                    {children}
                </div>
                <div className="d-md-none d-flex align-items-center">
                    <Link href="#" onClick={() => setOpenSidebar(true)} className="page-header-right-open-toggle">
                        <FiAlignRight className="fs-20" />
                    </Link>
                </div>
            </div>

        </div>
    )
}

export default PageHeader