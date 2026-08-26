import React from 'react'
import Link from 'next/link';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { usePermissions } from '@/hooks/usePermissions';

const LeadsListHeader = ({ selectedLeads = [], onBulkAction, totalLeads, totalAssigned, filteredAssigned, hasFilter }) => {
    const { hasPermission } = usePermissions()

    return (
        <>
        <div className="d-flex align-items-center justify-content-between w-100 page-header-right-items-wrapper" style={{paddingBottom:'15px'}}>

        {/* Counts Display - Left Side */}
        <div className="d-flex gap-4">
            <div className="text-center">
                <h6 className="mb-1">{totalLeads}</h6>
                <small className="text-muted">Total Leads</small>
            </div>
           
            {hasFilter && (
                <div className="text-center">
                    <h6 className="mb-1">{filteredAssigned}</h6>
                    <small className="text-muted">Assigned in Filtered</small>
                </div>
            )}
        </div>

        {/* Buttons - Right Side */}
        <div className="d-flex align-items-center gap-2">
            {hasPermission('create-leads') && (
              <Link href="/leads/create" className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Create Lead</span>
              </Link>
            )}

            {hasPermission('save-draft-button') && (
              <button
                className="btn btn-light-brand"
                onClick={selectedLeads.length > 0 ? onBulkAction : () => alert('Please select leads to perform action')}
                disabled={selectedLeads.length === 0}
              >
                <FiPlus size={16} className="me-2" />
                <span>Save Draft</span>
              </button>
            )}
        </div>

        </div>
        </>
    )
}

export default LeadsListHeader