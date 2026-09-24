'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { FiEdit3, FiTrash2, FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { encryptId } from "@/utils/encryptId";
import { formatDate } from "@/utils/formatDate";

const RolesListPage = () => {
    const { hasPermission } = usePermissions()
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [entriesPerPage, setEntriesPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId'))

    // Fetch roles from API
    useEffect(() => {
    const fetchRoles = async () => {
        try {
            setLoading(true);
            const cid = companyId ? JSON.parse(companyId) : null;
            if (!cid) return;

            const response = await crmInstance.get(`/roles/${cid}`);
            const rolesData = response.data.data || response.data || [];

            setRoles(rolesData);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load roles.');
            setRoles([]);
        } finally {
            setLoading(false);
        }
    };

    fetchRoles();
}, [companyId]);

    
    const filteredRoles = roles.filter(role =>
        role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate pagination
    const totalPages = Math.ceil(filteredRoles.length / entriesPerPage)
    const startIndex = (currentPage - 1) * entriesPerPage
    const paginatedRoles = filteredRoles.slice(startIndex, startIndex + entriesPerPage)

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handleEntriesChange = (e) => {
        setEntriesPerPage(parseInt(e.target.value))
        setCurrentPage(1)
    }

    // Delete role handler
    const handleDeleteRole = async (roleId, roleName) => {
        const result = await Swal.fire({
            title: 'Delete Role?',
            text: `Are you sure you want to delete role "${roleName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) return

        try {
            const cid = companyId ? JSON.parse(companyId) : null;
            if (!cid) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            await crmInstance.delete(`/roles/${cid}/${roleId}`)
            setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId))
            Swal.fire({
                title: 'Deleted!',
                text: `Role "${roleName}" has been deleted successfully.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            console.error('Failed to delete role:', err)
            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete role.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }

    return (
         <PermissionGuard permission="view-roles" redirect={false}>
            <PageHeader>
                {/* <UsersHeader /> */}
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-header">
                                <h4 className="card-title">Roles</h4>
                                {hasPermission('create-roles') && (
                                    <Link href={`/roles/create`} className="btn btn-primary">
                                        <FiPlus className="me-2" />
                                        Create Role
                                    </Link>
                                )}
                            </div>
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
                                                    placeholder='Search roles...'
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
                                                <table className="table table-hover dataTable no-footer" id='rolesTable'>
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Permissions</th>
                                                <th>Created At</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-4">
                                                        <div className="d-flex justify-content-center">
                                                            <div className="spinner-border spinner-border-sm" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <span className="ms-2">Loading roles...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : paginatedRoles.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-4">
                                                        {searchTerm ? 'No roles found matching your search.' : 'No roles found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedRoles.map((role, index) => (
                                                    <tr key={role.id}>
                                                        <td>{startIndex + index + 1}</td>
                                                        <td>{role.name}</td>
                                                        <td>{role.description || 'N/A'}</td>
                                                        <td>
                                                            {role.permissions && role.permissions.length > 0 ? (
                                                                <span className="badge bg-primary">{role.permissions.length} permissions</span>
                                                            ) : (
                                                                <span className="text-muted">No permissions</span>
                                                            )}
                                                        </td>
                                                        <td>{formatDate(role.created_at)}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                            {hasPermission('edit-roles') && (
                                                            <Link href={`/roles/edit/${encryptId(role.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                <FiEdit3 />
                                                            </Link>
                                                            )}

                                                            {hasPermission('delete-roles') && (
                                                            <button
                                                                type="button"
                                                                className="avatar-text avatar-md"
                                                                onClick={() => handleDeleteRole(role.id, role.name)}
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
                                            Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredRoles.length)} of {filteredRoles.length} entries
                                            {searchTerm && ` (filtered from ${roles.length} total entries)`}
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

export default RolesListPage
