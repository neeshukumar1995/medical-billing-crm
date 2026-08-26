'use client'
import React from 'react'
import { FiDelete, FiEdit, FiMoreHorizontal, FiPlus, FiPrinter, FiTrash2, FiUserX } from 'react-icons/fi'
import Dropdown from '@/components/shared/Dropdown'
import topTost from '@/utils/topTost'
import Link from 'next/link'

const options = [
    { icon: <FiUserX />, label: "Make as Lost" },
    { icon: <FiDelete />, label: "Make as Junk" },
    { icon: <FiTrash2 />, label: "Delete as Lead" },
]
const LeadsViewHeader = ({ leadData }) => {
    const handleClick = () => {
        topTost()
    };

    return (
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
            <div className="me-3">
                <h4 className="mb-0 fw-bold">{leadData?.client_name || 'Lead Details'}</h4>
                <small className="text-muted">
                    {leadData?.company && `${leadData.company} • `}
                    {leadData?.email}
                </small>
            </div>
            <a href="#" className="btn btn-icon btn-light-brand">
                <FiPrinter size={16} strokeWidth={1.6} />
            </a>
            <Link href={`/leads/edit/${leadData?.id}`} className="btn btn-icon btn-light-brand">
                <FiEdit size={16} strokeWidth={1.6} />
            </Link>
            <Dropdown
                dropdownItems={options}
                dropdownAutoClose={"outside"}
                triggerPosition={"0, 10"}
                triggerClass='btn btn-icon btn-light-brand'
                triggerIcon={<FiMoreHorizontal size={16} />}
            />
            <a href="#" className="btn btn-primary" onClick={handleClick}>
                <FiPlus size={16} className='me-2' />
                <span>Make as Customer</span>
            </a>
        </div>
    )
}

export default LeadsViewHeader