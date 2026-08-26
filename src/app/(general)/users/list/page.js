'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { FiEdit3, FiEye, FiUserCheck, FiTrash2 } from 'react-icons/fi'
import SelectDropdown from '@/components/shared/SelectDropdown';
import Link from 'next/link';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/shared/Spinner';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { getImageUrl } from '@/config/api';
import { encryptId } from "@/utils/encryptId";

 


const statusOptions = [
    { value: 'Active', label: 'Active', color: '#17c666' },
    { value: 'Inactive', label: 'Inactive', color: '#ffa21d' },
];


const getStatusOption = (statusValue) => {
    return statusOptions.find(option => option.value === statusValue) || statusOptions[0];
};

const TableCell = ({ options, defaultSelect, onStatusChange, userId }) => {
    const [selectedOption, setSelectedOption] = useState(() => {
        // Initialize with the defaultSelect option
        return options.find(opt => opt.value === defaultSelect) || options[0];
    });

    const handleStatusChange = async (option) => {
        setSelectedOption(option);
        if (onStatusChange) {

            const statusValue = option?.value || option;
            await onStatusChange(userId, statusValue);
        }
    };

    return (
        <SelectDropdown
            options={options}
            selectedOption={selectedOption}
            onSelectOption={handleStatusChange}
        />
    );
};

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [roles, setRoles] = useState([])
    const [showRoleModal, setShowRoleModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [selectedRole, setSelectedRole] = useState('')
    const [selectedUsers, setSelectedUsers] = useState([])
    const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId'))

       
   
    const getProfileImageUrl = (profileImagePath) => {
        if (!profileImagePath) return null
        return getImageUrl(profileImagePath)
    }

    const fetchUsers = async (page = 1, append = false) => {
        try {
            if (page === 1) {
                setLoading(true)
            } else {
                setLoadingMore(true)
            }


            const params = { page }
            if (searchTerm) {
                params.search = searchTerm
            }

            const cid = companyId ? JSON.parse(companyId) : null;
            if (!cid) return;

            const response = await crmInstance.get(`/users/${cid}`, { params })
            const usersData = response.data;

            // console.log('API Response:', response);
            // console.log('Company ID being sent:', params.company_id);
            // console.log('Users data:', usersData);

            if (append) {
                setUsers(prevUsers => {
                    const combined = [...prevUsers, ...usersData]
                    // Remove duplicates based on id
                    const unique = combined.filter((user, index, self) =>
                        index === self.findIndex(u => u.id === user.id)
                    )
                    return unique
                })
            } else {
                setUsers(usersData)
            }
            setHasMore(usersData.length === 5) 
            setError('')
                 } catch (err) {
           
             let errorMessage = 'Failed to load users. Please try again.'

            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view users.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }

            setError(errorMessage)
            if (!append) {
                setUsers([])
            }
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    // Fetch roles from API
    const fetchRoles = async (cid) => {
        try {
            const response = await crmInstance.get(`/roles/${cid}`)
            const rolesData = response.data.data || response.data || []
            setRoles(rolesData)
        } catch (err) {
            // console.error('Failed to fetch roles:', err)
        }
    }

    // Initial load
    useEffect(() => {
        fetchUsers(1, false)
        const cid = companyId ? JSON.parse(companyId) : null;
        if (cid) {
            fetchRoles(cid)
        }
    }, [companyId])

    // Listen for company changes from localStorage
    useEffect(() => {
        const handleStorageChange = () => {
            const newCompanyId = localStorage.getItem('companyId')
            if (newCompanyId !== companyId) {
                setCompanyId(newCompanyId)
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [companyId])

    // Handle search
    useEffect(() => {
        // Debounce search for both search and clear
        const timeoutId = setTimeout(() => {
            setCurrentPage(1)
            setUsers([])
            setSelectedUsers([]) // Clear selections when searching
            fetchUsers(1, false)
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [searchTerm])

    // Clear selections when users data changes
    useEffect(() => {
        setSelectedUsers([])
    }, [users])

    // Infinite scroll functionality
    const loadMoreUsers = () => {
        if (!loadingMore && hasMore) {
            const nextPage = currentPage + 1
            setCurrentPage(nextPage)
            fetchUsers(nextPage, true)
        }
    }

    // Scroll event handler
    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // Load more when user is 200px from bottom
        if (scrollTop + windowHeight >= documentHeight - 200) {
            loadMoreUsers()
        }
    }

    // Add scroll event listener
    useEffect(() => {
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [loadingMore, hasMore, currentPage])

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
    }

    // Handle select all checkbox
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(users.map(user => user.id))
        } else {
            setSelectedUsers([])
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
    const isAllSelected = users.length > 0 && selectedUsers.length === users.length

    // Check if some users are selected (for indeterminate state)
    const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < users.length

    // Bulk save to draft handler
    const handleBulkSaveDraft = async () => {
        if (selectedUsers.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select users to save to draft.',
                icon: 'warning',
                confirmButtonText: 'OK'
            })
            return
        }

        const result = await Swal.fire({
            title: 'Action Required',
            text: `What would you like to do with ${selectedUsers.length} selected user(s)?`,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonColor: '#ffc107',
            denyButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Save to Draft',
            denyButtonText: 'Permanently Delete',
            cancelButtonText: 'Cancel'
        })

        if (result.isConfirmed) {
            // Save to draft
            try {
                // Process each selected user
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

                const promises = selectedUsers.map(userId =>
                    crmInstance.delete(`/users/${cid}/${userId}/soft`)
                )

                await Promise.all(promises)

                // Remove users from the list
                setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.includes(user.id)))

                // Clear selections
                setSelectedUsers([])

                Swal.fire({
                    title: 'Success!',
                    text: `${selectedUsers.length} user(s) have been moved to draft.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
            } catch (err) {
                console.error('Failed to save users to draft:', err)
                const errorMessage = getErrorMessage(err, 'save users to draft')
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
            }
        } else if (result.isDenied) {
            // Permanently delete
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

                await crmInstance.delete(`/users/bulk-delete/${cid}`, {
                    data: { ids: selectedUsers }
                })

                // Remove users from the list
                setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.includes(user.id)))

                // Clear selections
                setSelectedUsers([])

                Swal.fire({
                    title: 'Deleted!',
                    text: `${selectedUsers.length} user(s) have been permanently deleted.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
            } catch (err) {
                console.error('Failed to permanently delete users:', err)
                const errorMessage = getErrorMessage(err, 'permanently delete users')
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
            }
        }
    }


    // Helper function to get error message
    const getErrorMessage = (err, action) => {
        if (err.response?.status === 401) {
            return 'Authentication failed. Please login again.';
        } else if (err.response?.status === 403) {
            return `You do not have permission to ${action}.`;
        } else if (err.response?.status === 404) {
            return 'User not found.';
        } else if (err.response?.data?.message) {
            return err.response.data.message;
        } else if (err.response?.data?.error) {
            return err.response.data.error;
        }
        return `Failed to ${action}`;
    };

    // Role assignment functions
    const handleAssignRole = async (user) => {
        const cid = companyId ? JSON.parse(companyId) : null;
   
        if (cid) {
            await fetchRoles(cid);
        }
        setSelectedUser(user)
        setSelectedRole(user.role_id || '')
        setShowRoleModal(true)
    }

    const handleRoleSubmit = async () => {
        if (!selectedUser || !selectedRole) return

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

            const response = await crmInstance.post(`/users/${cid}/${selectedUser.id}/assign-role`, {
                role_id: selectedRole
            })

            // Update user in the list
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === selectedUser.id
                        ? {
                            ...user,
                            role_id: selectedRole,
                            user_role: {
                                ...user.user_role,
                                name: roles.find(r => r.id == selectedRole)?.name || user.user_role?.name
                            }
                        }
                        : user
                )
            )

            setShowRoleModal(false)
            setSelectedUser(null)
            setSelectedRole('')

            Swal.fire({
                title: 'Success!',
                text: 'Role assigned successfully!',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            console.error('Failed to assign role:', err)
            Swal.fire({
                title: 'Error!',
                text: 'Failed to assign role.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }

    // Delete user handler
    const handleDeleteUser = async (user) => {
        const result = await Swal.fire({
            title: 'Delete User',
            text: `Choose how to delete ${user.name}:`,
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonColor: '#d33',
            denyButtonColor: '#ffc107',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Permanently Delete',
            denyButtonText: 'Save to Draft',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            // Permanent delete
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

                await crmInstance.delete(`/users/${cid}/${user.id}/hard`);

                // Remove user from the list
                setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));

                Swal.fire({
                    title: 'Deleted!',
                    text: 'User has been permanently deleted.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error('Failed to delete user:', err);
                const errorMessage = getErrorMessage(err, 'permanently delete user');
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } else if (result.isDenied) {
            // Save to draft (soft delete)
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

                await crmInstance.delete(`/users/${cid}/${user.id}/soft`);

                // Remove user from the list (since it's soft deleted)
                setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));

                Swal.fire({
                    title: 'Saved to Draft!',
                    text: 'User has been moved to draft.',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error('Failed to save user to draft:', err);
                const errorMessage = getErrorMessage(err, 'save user to draft');
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }
    };

    // Status update handler
    const handleStatusChange = async (userId, newStatus) => {
        try {
            // Get company ID from localStorage for the API endpoint
            const currentCompanyId = localStorage.getItem('companyId')
            const parsedCompanyId = currentCompanyId ? JSON.parse(currentCompanyId) : null

            if (!parsedCompanyId) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.patch(`/users/${parsedCompanyId}/${userId}/status`, {
                status: newStatus
            })

            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, status: newStatus } : user
                )
            )

            Swal.fire({
                title: 'Updated!',
                text: `User status has been updated to ${newStatus}.`,
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#007bff',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            console.error('Failed to update user status:', err)
            console.error('Error response:', err.response)
            console.error('Error status:', err.response?.status)
            console.error('Error data:', err.response?.data)

            let errorMessage = 'Failed to update user status'

            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to update this user.'
            } else if (err.response?.status === 404) {
                errorMessage = 'User not found.'
            } else if (err.response?.status === 422) {
                errorMessage = 'Invalid status value.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error
            }

            Swal.fire({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            })

            // Revert the status change in UI if API call failed
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, status: user.status } : user
                )
            )
        }
    }

    return (
        <PermissionGuard permission="view-users" redirect={false}>
            <PageHeader>
                <UsersHeader onSaveDraft={handleBulkSaveDraft} selectedUsersCount={selectedUsers.length} />
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
                                                    placeholder='Search users...'
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
                                                <table className="table table-hover dataTable no-footer" id='userList'>
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        className="custom-table-checkbox"
                                                        id="selectAllUsers"
                                                        checked={isAllSelected}
                                                        ref={(el) => {
                                                            if (el) el.indeterminate = isIndeterminate
                                                        }}
                                                        onChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th>Employee</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>Role</th>
                                                <th>Department</th>
                                                {hasPermission('user-status') && (
                                                <th>Status</th>
                                                )}
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
                                                            <span className="ms-2">Loading users...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : users.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4">
                                                        {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                users.map((user, index) => (
                                                    <tr key={user.id}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                className="custom-table-checkbox"
                                                                id={`user-${user.id}`}
                                                                checked={selectedUsers.includes(user.id)}
                                                                onChange={() => handleUserSelect(user.id)}
                                                            />
                                                        </td>
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
                                                                                // Fallback to default avatar if image fails to load
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
                                                        <td>{user.user_role.name}</td>
                                                        <td>{user.department || 'N/A'}</td>
                                                       {hasPermission('user-status') && (
                                                        <td>
                                                            <TableCell
                                                                options={statusOptions}
                                                                defaultSelect={user.status || 'Active'}
                                                                onStatusChange={handleStatusChange}
                                                                userId={user.id}
                                                            />
                                                        </td>
                                                       )}
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                               {hasPermission('view-users') && (
                                                                <Link href={`/users/view/${encryptId(user.id)}`} className="avatar-text avatar-md" title="View">
                                                                    <FiEye />
                                                                </Link>
                                                               )}
                                                               {hasPermission('edit-users') && (
                                                                <Link href={`/users/edit/${encryptId(user.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                    <FiEdit3 />
                                                                </Link>
                                                               )}
                                                               {hasPermission('edit-users') && (
                                                                <button
                                                                    type="button"
                                                                    className="avatar-text avatar-md"
                                                                    onClick={() => handleAssignRole(user)}
                                                                    title="Assign Role"
                                                                >
                                                                    <FiUserCheck />
                                                                </button>
                                                               )}
                                                               {hasPermission('delete-users') && (
                                                                <button
                                                                    type="button"
                                                                    className="avatar-text avatar-md"
                                                                    onClick={() => handleDeleteUser(user)}
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

                                            {/* Loading more spinner */}
                                            {loadingMore && (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4">
                                                        <div className="d-flex justify-content-center align-items-center">
                                                            <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                                                            <span className="ms-2">Loading more users...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* No more data indicator */}
                                            {!loadingMore && !hasMore && users.length > 0 && (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4 text-muted">
                                                        <small>No more users to load</small>
                                                    </td>
                                                </tr>
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

            {/* Role Assignment Modal */}
            {showRoleModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Assign Role to {selectedUser?.name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowRoleModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Select Role</label>
                                    <select
                                        className="form-select"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                    >
                                        <option value="">Select a role</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleRoleSubmit}>
                                    Assign Role
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showRoleModal && <div className="modal-backdrop fade show"></div>}
        </PermissionGuard>
    )
}

export default page
