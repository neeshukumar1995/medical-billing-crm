'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi'
import Link from 'next/link';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/shared/Spinner';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { encryptId } from "@/utils/encryptId";

// Helper function to ensure data is an array
const ensureArray = (data) => {
    return Array.isArray(data) ? data : [];
};


const page = () => {
    const { hasPermission } = usePermissions()
    const router = useRouter()
    const [leadStatuses, setLeadStatuses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [companyId, setCompanyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })

    // Fetch lead statuses from API
    const fetchLeadStatuses = async () => {
        try {
            setLoading(true)

            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            const params = {}
            if (searchTerm) {
                params.search = searchTerm
            } else {
                params.limit = 1000 // Fetch all when no search
            }

            const response = await crmInstance.get(`/lead-status/${cid}`, { params })

            let leadStatusesData = []

            // Unified response handling
            if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
                leadStatusesData = response.data.data.data
            } else if (response.data && Array.isArray(response.data.data)) {
                leadStatusesData = response.data.data
            } else if (Array.isArray(response.data)) {
                leadStatusesData = response.data
            }

            setLeadStatuses(leadStatusesData)
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load lead statuses. Please try again.'

            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view lead statuses.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }

            setError(errorMessage)
            setLeadStatuses([])
        } finally {
            setLoading(false)
        }
    }

    // Handle search and initial load
    useEffect(() => {
        if (companyId) {
            fetchLeadStatuses()
        }
    }, [searchTerm, companyId])


    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
    }

    // Delete lead status handler
    const handleDeleteLeadStatus = async (leadStatusId, leadStatusName) => {
        const result = await Swal.fire({
            title: 'Delete Lead Status',
            text: `Are you sure you want to delete "${leadStatusName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        });

        if (result.isConfirmed) {
            try {



                const cid = companyId ? JSON.parse(companyId) : null
                if (!cid) {
                    Swal.fire({
                        title: 'Error!',
                        text: 'Company ID not found. Please refresh the page and try again.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    })
                    return
                }

                const response = await crmInstance.delete(`/lead-status/${cid}/${leadStatusId}`);



                // Remove lead status from local state
                setLeadStatuses(prevLeadStatuses => prevLeadStatuses.filter(leadStatus => leadStatus.id !== leadStatusId));

                Swal.fire({
                    title: 'Deleted!',
                    text: `Lead status "${leadStatusName}" has been deleted successfully.`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {

                let errorMessage = getErrorMessage(err, 'delete this lead status');
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }
    };

    // Helper function to get error message
    const getErrorMessage = (err, action) => {
        if (err.response?.status === 401) {
            return 'Authentication failed. Please login again.';
        } else if (err.response?.status === 403) {
            return `You do not have permission to ${action}.`;
        } else if (err.response?.status === 404) {
            return 'Lead status not found.';
        } else if (err.response?.data?.message) {
            return err.response.data.message;
        } else if (err.response?.data?.error) {
            return err.response.data.error;
        }
        return `Failed to ${action}`;
    };


    return (
        <PermissionGuard permission="view-leads-status" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('create-leads-status') && (

                        <Link href="/leads/lead-status/create" className="btn btn-primary">
                            <i className="me-2">➕</i>
                            Create Lead Status
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {/* Debug info - remove this after testing */}


                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Spinner classNames={{ label: "text-foreground mt-4" }} label="spinner" variant="spinner" />
                                    </div>
                                )}

                                {/* Search */}
                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='dataTables_filter d-flex justify-content-end'>
                                            <label className='d-inline-flex align-items-center gap-2'>
                                                Search:
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={handleSearchChange}
                                                    placeholder='Search lead statuses...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>



                                <div className="table-responsive">
                                    <div className='dataTables_wrapper dt-bootstrap5 no-footer'>
                                        <div className="row dt-row">
                                            <div className="col-sm-12 px-0">
                                                <table className="table table-hover dataTable no-footer" id='leadStatusList'>
                                                    <thead>
                                                        <tr>
                                                            <th>S.No</th>
                                                            <th>Name</th>
                                                            <th className="text-end">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {loading ? (
                                                            <tr>
                                                                <td colSpan="3" className="text-center py-4">
                                                                    <div className="d-flex justify-content-center">
                                                                        <div className="spinner-border spinner-border-sm" role="status">
                                                                            <span className="visually-hidden">Loading...</span>
                                                                        </div>
                                                                        <span className="ms-2">Loading lead statuses...</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : leadStatuses.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="3" className="text-center py-4">
                                                                    {searchTerm ? 'No lead statuses found matching your search.' : 'No lead statuses found.'}
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            leadStatuses.map((leadStatus, index) => (
                                                                <tr key={leadStatus.id || index}>
                                                                    <td>{index + 1}</td>
                                                                    <td>{leadStatus.name || 'N/A'}</td>
                                                                    <td className="text-end">
                                                                        <div className="hstack gap-2 justify-content-end">
                                                                            <Link href={`/leads/lead-status/view/${encryptId(leadStatus.id)}`} className="avatar-text avatar-md" title="View">
                                                                                <FiEye />
                                                                            </Link>
                                                                            {hasPermission('edit-leads-status') && (

                                                                                <Link href={`/leads/lead-status/edit/${encryptId(leadStatus.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                                    <FiEdit3 />
                                                                                </Link>
                                                                            )}

                                                                            {hasPermission('delete-leads-status') && (

                                                                                <button
                                                                                    type="button"
                                                                                    className="avatar-text avatar-md"
                                                                                    onClick={() => handleDeleteLeadStatus(leadStatus.id, leadStatus.name)}
                                                                                    title="Delete"
                                                                                >
                                                                                    <FiTrash2 />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
