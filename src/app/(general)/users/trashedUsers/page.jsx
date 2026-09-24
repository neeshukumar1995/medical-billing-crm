'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { FiEye, FiRotateCcw } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { getImageUrl } from '@/config/api'
import { formatDateTime } from '@/utils/formatDate'

const TrashedUsersPage = () => {
    const { hasPermission } = usePermissions()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [entriesPerPage, setEntriesPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedUsers, setSelectedUsers] = useState([])
    const [companyId, setCompanyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })

    // Helper function to construct full image URL
    const getProfileImageUrl = (profileImagePath) => {
        if (!profileImagePath) return null
        return getImageUrl(profileImagePath)
    }

    // Fetch trashed users
    useEffect(() => {
        const fetchTrashedUsers = async () => {
            try {
                setLoading(true)
                const cid = companyId ? JSON.parse(companyId) : null;
                console.log('Company ID for trashed users:', cid)
                if (!cid) {
                    console.log('No company ID found, skipping fetch')
                    setLoading(false)
                    return
                }

                console.log('Fetching trashed users from:', `/users/trashed/${cid}`)
                const response = await crmInstance.get(`/users/trashed/${cid}`)
                console.log('Trashed users API response:', response.data)

                // Handle different possible structures
                let usersData = []
                if (Array.isArray(response.data?.data)) {
                    usersData = response.data.data
                } else if (Array.isArray(response.data?.data?.data)) {
                    usersData = response.data.data.data
                } else if (Array.isArray(response.data)) {
                    usersData = response.data
                }

                console.log('Extracted users data:', usersData)
                console.log('Number of trashed users:', usersData.length)
                setUsers(usersData)
                setError('')
            } catch (err) {
                console.error('Failed to fetch trashed users:', err)
                console.error('Error response:', err.response)
                console.error('Error status:', err.response?.status)
                console.error('Error data:', err.response?.data)
                setError(err.response?.data?.message || 'Failed to load trashed users.')
            } finally {
                setLoading(false)
            }
        }

        if (companyId) {
            fetchTrashedUsers()
        } else {
            console.log('No companyId in localStorage')
            setLoading(false)
        }
    }, [companyId])

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handleEntriesChange = (e) => {
        setEntriesPerPage(parseInt(e.target.value))
        setCurrentPage(1)
    }

    // Filtered & paginated users
    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const totalPages = Math.ceil(filteredUsers.length / entriesPerPage)
    const startIndex = (currentPage - 1) * entriesPerPage
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + entriesPerPage)

    // Handle select all checkbox
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(paginatedUsers.map(user => user.id))
        } else {
            setSelectedUsers([])
        }
    }

    // Handle bulk restore for selected users
    const handleBulkRestoreSelected = async () => {
        if (selectedUsers.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select users to restore.',
                icon: 'warning',
                confirmButtonText: 'OK'
            })
            return
        }

        const result = await Swal.fire({
            title: 'Bulk Restore Users',
            text: `Are you sure you want to restore ${selectedUsers.length} selected user(s)?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Restore Selected',
            cancelButtonText: 'Cancel'
        })

        if (result.isConfirmed) {
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

                const response = await crmInstance.post(`/users/bulk-restore/${cid}`, {
                    ids: selectedUsers
                })

                console.log('Bulk restore response:', response.data)
                console.log('Selected users for restore:', selectedUsers)

                if (response.data && response.data.status) {
                    // Remove restored users from the list
                    setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.includes(user.id)))

                    // Clear selections
                    setSelectedUsers([])

                    Swal.fire({
                        title: 'Success!',
                        text: `${response.data.restored_count || selectedUsers.length} user(s) have been restored successfully.`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    })
                } else {
                    throw new Error(response.data?.message || 'Bulk restore failed')
                }
            } catch (err) {
                console.error('Failed to bulk restore users:', err)
                const errorMessage = err.response?.data?.message || 'Failed to restore selected users. Please try again.'
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
            }
        }
    }

    // Handle individual user checkbox
    const handleUserSelect = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    // Check if all users are selected
    const isAllSelected = paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length

    // Check if some users are selected (for indeterminate state)
    const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < paginatedUsers.length


    // Restore user
    const handleRestoreUser = async (userId, userName) => {
        const result = await Swal.fire({
            title: 'Restore User?',
            text: `Do you want to restore user "${userName}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Restore'
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

            await crmInstance.post(`/users/${cid}/${userId}/restore`)
            setUsers(prev => prev.filter(user => user.id !== userId))
            Swal.fire({
                title: 'Restored!',
                text: `User "${userName}" restored successfully.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            console.error('Failed to restore user:', err)
            const errorMessage = err.response?.data?.message || 'Failed to restore user.'
            Swal.fire({ title: 'Error!', text: errorMessage, icon: 'error' })
        }
    }



    return (
        <PermissionGuard permission="view-trashed-users" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-3 page-header-right-items-wrapper">
                    <button
                        onClick={handleBulkRestoreSelected}
                        className={`btn ${selectedUsers.length > 0 ? 'btn-success' : 'btn-outline-secondary'}`}
                        disabled={selectedUsers.length === 0}
                        title={selectedUsers.length > 0 ? `Restore ${selectedUsers.length} selected user(s)` : 'Select users to restore'}
                    >
                        <FiRotateCcw size={16} className="me-2" />
                        <span>All Restore</span>
                        {selectedUsers.length > 0 && (
                            <span className="badge bg-light text-dark ms-2">{selectedUsers.length}</span>
                        )}
                    </button>
                    
                  
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
                                                    placeholder='Search...'
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
                                                <table className="table table-hover dataTable no-footer" id='trashedUsersTable'>
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        className="custom-table-checkbox"
                                                        id="selectAllTrashedUsers"
                                                        checked={isAllSelected}
                                                        ref={(el) => {
                                                            if (el) el.indeterminate = isIndeterminate
                                                        }}
                                                        onChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th>S.No</th>
                                                <th>User</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>Role</th>
                                                <th>Department</th>
                                                <th>Deleted At</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4">
                                                        <div className="d-flex justify-content-center">
                                                            <div className="spinner-border spinner-border-sm" role="status">
                                                                <span className="visually-hidden">Loading...</span>
                                                            </div>
                                                            <span className="ms-2">Loading trashed users...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : paginatedUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4">
                                                        {searchTerm ? 'No trashed users found matching your search.' : 'No trashed users found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedUsers.map((user, index) => (
                                                    <tr key={user.id}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                className="custom-table-checkbox"
                                                                id={`trashed-user-${user.id}`}
                                                                checked={selectedUsers.includes(user.id)}
                                                                onChange={() => handleUserSelect(user.id)}
                                                            />
                                                        </td>
                                                        <td>{startIndex + index + 1}</td>
                                                        <td>
                                                            <div className="hstack gap-3">
                                                                {user.profile_image ? (
                                                                    <div className="avatar-image avatar-md">
                                                                        <img
                                                                            src={getProfileImageUrl(user.profile_image)}
                                                                            alt={`${user.name} profile`}
                                                                            className="img-fluid rounded-circle"
                                                                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                                            onError={(e) => {
                                                                                e.target.style.display = 'none'
                                                                                e.target.nextSibling.style.display = 'flex'
                                                                            }}
                                                                        />
                                                                        <div
                                                                            className="text-white avatar-text user-avatar-text avatar-md"
                                                                            style={{ display: 'none' }}
                                                                        >
                                                                            {user.name?.substring(0, 1)}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-white avatar-text user-avatar-text avatar-md">
                                                                        {user.name?.substring(0, 1)}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="text-truncate-1-line">{user.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <a href={`mailto:${user.email}`}>{user.email}</a>
                                                        </td>
                                                        <td>
                                                            <a href={`tel:${user.phone}`}>{user.phone || 'N/A'}</a>
                                                        </td>
                                                        <td>{user.role}</td>
                                                        <td>{user.department || 'N/A'}</td>
                                                        <td>{formatDateTime(user.deleted_at)}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                <button className='btn btn-sm btn-success' onClick={() => handleRestoreUser(user.id, user.name)}>Restore</button>
                                                                {/* <Link href={`/users/view/${user.id}`} className='btn btn-sm btn-primary ms-1'><FiEye /></Link> */}
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
                                            Showing {startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredUsers.length)} of {filteredUsers.length} entries
                                            {searchTerm && ` (filtered from ${users.length} total entries)`}
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

export default TrashedUsersPage
