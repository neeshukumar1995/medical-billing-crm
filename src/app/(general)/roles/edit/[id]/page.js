'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { useRouter, useParams } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import { FiSave, FiUser, FiFileText, FiShield, FiCheckCircle, FiEdit3, FiX } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { decryptId } from '@/utils/decryptId'
import { canGrantPermission } from '@/utils/permissionAccess'

const EditRolePage = () => {
    const router = useRouter()
    const { id } = useParams()
    const actualId = useMemo(() => decryptId(id), [id])
    const { role, permissions: heldPermissions } = useUser()

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    })
    const [permissions, setPermissions] = useState([])
    const [selectedPermissions, setSelectedPermissions] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [error, setError] = useState('')
    const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId'))

    // Fetch role data and permissions on component mount
    useEffect(() => {
        if (!actualId) return

        const fetchData = async () => {
            try {
                setIsLoadingData(true)

                const cid = companyId ? JSON.parse(companyId) : null;
                if (!cid) return;

                // Fetch role data
                const roleResponse = await crmInstance.get(`/roles/${cid}/${actualId}`)
                const roleData = roleResponse.data.data || roleResponse.data

                setFormData({
                    name: roleData.name || '',
                    description: roleData.description || ''
                })

                // Set selected permissions
                if (roleData.permissions) {
                    setSelectedPermissions(roleData.permissions.map(p => p.id))
                }

                // Fetch all permissions
                const permissionsResponse = await crmInstance.get('/permissions')
                const permissionsData = permissionsResponse.data.data || permissionsResponse.data || []
                setPermissions(permissionsData)

            } catch (err) {
                console.error('Failed to fetch data:', err)
                setError('Failed to load role data')
            } finally {
                setIsLoadingData(false)
            }
        }

        if (actualId && companyId) {
            fetchData()
        }
    }, [actualId, companyId])

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Handle permission checkbox changes
    const handlePermissionChange = (permissionId) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        )
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const cid = companyId ? JSON.parse(companyId) : null;
            if (!cid) {
                setError('Company ID not found. Please refresh the page and try again.')
                setIsLoading(false)
                return
            }

            const updateData = {
                name: formData.name,
                description: formData.description,
                permissions: selectedPermissions
            }

            const response = await crmInstance.put(`/roles/${cid}/${actualId}`, updateData)

            if (response.data?.status) {
                Swal.fire({
                    title: 'Success!',
                    text: response.data?.message || 'Role updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/roles/list')
                })
            }
        } catch (err) {
            console.error('Role update failed:', err)
            setError(err.response?.data?.message || 'Failed to update role')
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoadingData) {
        return (
       <PermissionGuard permission="edit-roles" redirect={false}>
                <PageHeader>
                  
                </PageHeader>
                <div className='main-content'>
                    <div className='row'>
                        <div className="col-lg-12">
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
           </PermissionGuard>
        )
    }

    return (
       <PermissionGuard permission="edit-roles" redirect={false}>
            <PageHeader>
               
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                      

                        {/* Main Form Card */}
                        <div className="card shadow-lg border-0"
                             style={{
                                 borderRadius: '20px',
                                 boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                             }}>
                                <div className="card-body text-left text-white">
                              
                                <h2 className="card-title fw-bold text-darkt">Edit Role</h2>
                       
                            </div>
                            <div className="card-body p-5">
                                {error && (
                                    <div className="alert alert-danger border-0 shadow-sm"
                                         style={{ borderRadius: '15px' }}>
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    {/* Basic Information Section */}
                                    <div className="mb-5">
                                        <div className="d-flex align-items-center mb-4">
                                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                                                 style={{ width: '40px', height: '40px' }}>
                                                <FiUser className="text-white" size={20} />
                                            </div>
                                            <h4 className="mb-0 fw-bold text-dark">Basic Information</h4>
                                        </div>

                                        <div className="row g-5">
                                            <div className="col-md-6">
                                                <div className="position-relative">
                                                    <FiShield className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        className="form-control shadow-sm ps-5"
                                                        placeholder="Enter role name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                        disabled={isLoading}
                                                        readOnly={formData.name.toLowerCase() === 'superadmin'}
                                                        style={{
                                                            borderRadius: '15px',
                                                            padding: '1.2rem 1rem 1.2rem 3rem',
                                                            fontSize: '1rem',
                                                            height: 'auto',
                                                            border: '2px solid #e9ecef',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    />
                                                    <label className="position-absolute top-0 start-0 ms-3 mt-1 text-muted fw-semibold"
                                                           style={{
                                                               fontSize: '0.75rem',
                                                               transform: 'translateY(-50%)',
                                                               background: 'white',
                                                               padding: '0 0.5rem',
                                                               zIndex: 5
                                                           }}>
                                                        Role Name <span className="text-danger">*</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="position-relative">
                                                    <FiFileText className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                                    <input
                                                        type="text"
                                                        name="description"
                                                        className="form-control shadow-sm ps-5"
                                                        placeholder="Enter role description"
                                                        value={formData.description}
                                                        onChange={handleInputChange}
                                                        disabled={isLoading}
                                                        style={{
                                                            borderRadius: '15px',
                                                            padding: '1.2rem 1rem 1.2rem 3rem',
                                                            fontSize: '1rem',
                                                            height: 'auto',
                                                            border: '2px solid #e9ecef',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    />
                                                    <label className="position-absolute top-0 start-0 ms-3 mt-1 text-muted fw-semibold"
                                                           style={{
                                                               fontSize: '0.75rem',
                                                               transform: 'translateY(-50%)',
                                                               background: 'white',
                                                               padding: '0 0.5rem',
                                                               zIndex: 5
                                                           }}>
                                                        Description (Optional)
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permissions Section */}
                                    <div className="mb-5">
                                        <div className="d-flex align-items-center mb-4">
                                            <div className="bg-success rounded-circle d-flex align-items-center justify-content-center me-3"
                                                 style={{ width: '40px', height: '40px' }}>
                                                <FiCheckCircle className="text-white" size={20} />
                                            </div>
                                            <h4 className="mb-0 fw-bold text-dark">Update Permissions</h4>
                                        </div>

                                        <div className="card border-0 shadow-sm"
                                           >
                                            <div className="card-body p-4">
                                                {permissions.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <div className="spinner-border text-primary" role="status">
                                                            <span className="visually-hidden">Loading...</span>
                                                        </div>
                                                        <p className="text-muted mt-3">Loading permissions...</p>
                                                    </div>
                                                ) : (
                                                    <div className="row g-3">
                                                        {permissions.filter(permission =>
                                                            canGrantPermission(permission.name, {
                                                                isSuperadmin: role === 'superadmin',
                                                                heldPermissions,
                                                            })
                                                        ).map(permission => (
                                                            <div key={permission.id} className="col-md-4 col-sm-6">
                                                                <div className="form-check p-3 rounded-3 hover-shadow d-flex align-items-center"
                                                                     style={{
                                                                         background: 'white',
                                                                         borderRadius: '12px',
                                                                         transition: 'all 0.3s ease',
                                                                         cursor: 'pointer',
                                                                         minHeight: '60px',
                                                                         border: '1px solid #e9ecef'
                                                                     }}>
                                                                    <input
                                                                        className="form-check-input flex-shrink-0"
                                                                        type="checkbox"
                                                                        id={`permission-${permission.id}`}
                                                                        checked={selectedPermissions.includes(permission.id)}
                                                                        onChange={() => handlePermissionChange(permission.id)}
                                                                        disabled={isLoading}
                                                                        style={{
                                                                            transform: 'scale(1.1)',
                                                                            marginRight: '0.75rem',
                                                                            marginLeft: '-7px'
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label fw-semibold text-dark mb-0 flex-grow-1"
                                                                           htmlFor={`permission-${permission.id}`}
                                                                           style={{
                                                                               cursor: 'pointer',
                                                                               wordWrap: 'break-word',
                                                                               lineHeight: '1.4'
                                                                           }}>
                                                                        {permission.name}
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                    {/* Submit Button */}
                                    <div className="text-center">
                                        <div className="d-flex gap-3 justify-content-center">
                                            <button type="submit"
                                                    className="btn btn-lg btn-primary"
                                                    disabled={isLoading}
                                                    style={{
                                                        background: '#382f88',
                                                        border: 'none',
                                                        
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                {isLoading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                                                        Updating Role...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave className="me-3" size={20} />
                                                        Update
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-lg btn-primary"
                                                onClick={() => router.push('/roles/list')}
                                                disabled={isLoading}
                                                style={{
                                                   border: '2px solid #6c757d',
                                                   transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <FiX className="me-3" size={20} />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default EditRolePage