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

const page = () => {
    const { hasPermission } = usePermissions()
    const router = useRouter()
    const [sources, setSources] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [companyId, setCompanyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })

    // Fetch sources from API
    const fetchSources = async () => {
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

            const response = await crmInstance.get(`/sources/${cid}`, { params })

            let sourcesData = []

            // Unified response handling
            if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
                sourcesData = response.data.data.data
            } else if (response.data && Array.isArray(response.data.data)) {
                sourcesData = response.data.data
            } else if (Array.isArray(response.data)) {
                sourcesData = response.data
            }

            setSources(sourcesData)
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load sources. Please try again.'

            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view sources.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }

            setError(errorMessage)
            setSources([])
        } finally {
            setLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        if (companyId) {
            fetchSources()
        }
    }, [companyId])

    // Handle search
    useEffect(() => {
        fetchSources()
    }, [searchTerm])



    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
    }

    // Delete source handler
    const handleDeleteSource = async (sourceId, sourceName) => {
        const result = await Swal.fire({
            title: 'Delete Source',
            text: `Are you sure you want to delete "${sourceName}"?`,
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

                const response = await crmInstance.delete(`/sources/${cid}/${sourceId}`);

                // Remove source from local state
                setSources(prevSources => prevSources.filter(source => source.id !== sourceId));

                Swal.fire({
                    title: 'Deleted!',
                    text: `Source "${sourceName}" has been deleted successfully.`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {

                let errorMessage = getErrorMessage(err, 'delete this source');
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
            return 'Source not found.';
        } else if (err.response?.data?.message) {
            return err.response.data.message;
        } else if (err.response?.data?.error) {
            return err.response.data.error;
        }
        return `Failed to ${action}`;
    };


    return (
        <PermissionGuard permission="view-sources" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('create-sources') && (
                        <Link href="/sources/create" className="btn btn-primary">
                            <i className="me-2">➕</i>
                            Create Source
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
                                                    placeholder='Search sources...'
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
                                                <table className="table table-hover dataTable no-footer" id='sourceList'>
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
                                                                        <span className="ms-2">Loading sources...</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : sources.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="3" className="text-center py-4">
                                                                    {searchTerm ? 'No sources found matching your search.' : 'No sources found.'}
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            sources.map((source, index) => (
                                                                <tr key={source.id || index}>
                                                                    <td>{index + 1}</td>
                                                                    <td>{source.name || 'N/A'}</td>
                                                                    <td className="text-end">
                                                                        <div className="hstack gap-2 justify-content-end">
                                                                            {hasPermission('view-sources') && (
                                                                                <Link href={`/sources/view/${encryptId(source.id)}`} className="avatar-text avatar-md" title="View">
                                                                                    <FiEye />
                                                                                </Link>
                                                                            )}
                                                                            {hasPermission('edit-sources') && (
                                                                                <Link href={`/sources/edit/${encryptId(source.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                                    <FiEdit3 />
                                                                                </Link>
                                                                            )}
                                                                            {hasPermission('delete-sources') && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="avatar-text avatar-md"
                                                                                    onClick={() => handleDeleteSource(source.id, source.name)}
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