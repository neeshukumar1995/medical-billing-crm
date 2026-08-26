import React from 'react'

const ConvertedLeadsHeader = ({ totalLeads, assignedLeads, unassignedLeads, convertedLeads, filteredAssigned, hasFilter }) => {

    return (
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">

        {/* Counts Display */}
        <div className="d-flex gap-4 ms-4">

            <div className="text-center">
                <h6 className="mb-1">{convertedLeads}</h6>
                <small className="text-muted">Converted Leads</small>
            </div>
            {hasFilter && (
                <div className="text-center">
                    <h6 className="mb-1">{filteredAssigned}</h6>
                    <small className="text-muted">Converted in Filtered</small>
                </div>
            )}
        </div>
        </div>
    )
}

export default ConvertedLeadsHeader