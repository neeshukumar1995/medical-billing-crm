'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { FiEdit3, FiTrash2 } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions';
import { encryptId } from "@/utils/encryptId";


const PermissionsListPage = () => {
    const { hasPermission } = usePermissions()
    const [permissions, setPermissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [entriesPerPage, setEntriesPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)

    // Fetch permissions from API
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                setLoading(true)
                const response = await crmInstance.get('/permissions')
                const permissionsData = response.data.data || response.data || []
                setPermissions(permissionsData)
                setError('')
            } catch (err) {
                console.error('Failed to fetch permissions:', err)
                setError(err.response?.data?.message || 'Failed to load permissions.')
                setPermissions([])
            } finally {
                setLoading(false)
            }
        }

        fetchPermissions()
    }, [])

    // Filter permissions based on search term
    const filteredPermissions = permissions.filter(permission =>
        permission.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate pagination
    const totalPages = Math.ceil(filteredPermissions.length / entriesPerPage)
    const startIndex = (currentPage - 1) * entriesPerPage
    const paginatedPermissions = filteredPermissions.slice(startIndex, startIndex + entriesPerPage)

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handleEntriesChange = (e) => {
        setEntriesPerPage(parseInt(e.target.value))
        setCurrentPage(1)
    }

    // Delete permission handler
    const handleDeletePermission = async (permissionId, permissionName) => {
        const result = await Swal.fire({
            title: 'Delete Permission?',
            text: `Are you sure you want to delete permission "${permissionName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/permissions/${permissionId}`)
            setPermissions(prevPermissions => prevPermissions.filter(permission => permission.id !== permissionId))
            Swal.fire({
                title: 'Deleted!',
                text: `Permission "${permissionName}" has been deleted successfully.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            console.error('Failed to delete permission:', err)
            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete permission.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }

    return (
        <PermissionGuard permission="view-permissions">
            <PageHeader>
                {/* <UsersHeader /> */}
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                                    </div>
                                )}

                                {/* DataTables Controls */}
                                <div className='row gy-2'>
                                    <div className='col-sm-12 col-md-6 ps-0 m-0 pb-10'>
                                        <div className='dataTables_length d-flex justify-content-md-start justify-content-center'>
                                            <label className='d-flex align-items-center gap-1'>
                                                Show
                                                <select
                                                    className='form-select form-select-sm w-auto pe-4'
                                                    value={entriesPerPage}
                                                    onChange={handleEntriesChange}
                                                >
                                                    {[10, 20, 30, 40, 50].map(pageSize => (
                                                        <option key={pageSize} value={pageSize}>
                                                            {pageSize}
                                                        </option>
                                                    ))}
                                                </select>
                                                entries
                                            </label>
                                        </div>
                                    </div>
                                    <div className='col-sm-12 col-md-6 ps-0 m-0 pb-10'>
                                        <div className='dataTables_filter d-flex justify-content-md-end justify-content-center'>
                                            <label className='d-inline-flex align-items-center gap-2'>
                                                Search:
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={handleSearchChange}
                                                    placeholder='Search permissions...'
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
                                                <table className="table table-hover dataTable no-footer" id='permissionsTable'>
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Created At</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-4">
                                                        <div className="d-flex justify-content-center">
                                                            <div className="spinner-border spinner-border-sm" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <span className="ms-2">Loading permissions...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : paginatedPermissions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-4">
                                                        {searchTerm ? 'No permissions found matching your search.' : 'No permissions found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedPermissions.map((permission, index) => (
                                                    <tr key={permission.id}>
                                                        <td>{startIndex + index + 1}</td>
                                                        <td>{permission.name}</td>
                                                        <td>{permission.description || 'N/A'}</td>
                                                        <td>{new Date(permission.created_at).toLocaleDateString()}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('edit-permissions') && (
                                                                <Link href={`/permissions/edit/${encryptId(permission.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                    <FiEdit3 />
                                                                </Link>
                                                                )}
                                                                 {hasPermission('delete-permissions') && (
                                                                <button
                                                                    type="button"
                                                                    className="avatar-text avatar-md"
                                                                    onClick={() => handleDeletePermission(permission.id, permission.name)}
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

                                {/* Pagination */}
                                <div className="row mt-3">
                                    <div className="col-sm-12 col-md-5">
                                        <div className="dataTables_info" role="status" aria-live="polite">
                                            Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredPermissions.length)} of {filteredPermissions.length} entries
                                            {searchTerm && ` (filtered from ${permissions.length} total entries)`}
                                        </div>
                                    </div>
                                    <div className="col-sm-12 col-md-7">
                                        <div className="dataTables_paginate paging_simple_numbers">
                                            <ul className="pagination justify-content-end">
                                                <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        aria-label="Previous"
                                                    >
                                                        <span aria-hidden="true">«</span>
                                                    </button>
                                                </li>
                                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    return (
                                                        <li key={pageNum} className={`paginate_button page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                                            <button
                                                                className="page-link"
                                                                onClick={() => setCurrentPage(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                                <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        aria-label="Next"
                                                    >
                                                        <span aria-hidden="true">»</span>
                                                    </button>
                                                </li>
                                            </ul>
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

export default PermissionsListPage