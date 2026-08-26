'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersCreateHeader from '@/components/usersCreate/UsersCreateHeader'
import { FiSave, FiUser, FiFileText, FiShield, FiCheckCircle } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard';

const RolesCreatePage = () => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [permissions, setPermissions] = useState([])
    const [loadingPermissions, setLoadingPermissions] = useState(true)
    const [error, setError] = useState('')
    const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId'))

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permission_ids: []
    })

    // Fetch permissions
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                setLoadingPermissions(true)
                const response = await crmInstance.get('/permissions')
                const permissionsData = response.data.data || response.data || []
                setPermissions(permissionsData)
            } catch (err) {
                console.error('Failed to fetch permissions:', err)
                setError('Failed to load permissions')
            } finally {
                setLoadingPermissions(false)
            }
        }

        fetchPermissions()
    }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handlePermissionChange = (permissionId) => {
        setFormData(prev => ({
            ...prev,
            permission_ids: prev.permission_ids.includes(permissionId)
                ? prev.permission_ids.filter(id => id !== permissionId)
                : [...prev.permission_ids, permissionId]
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        // Prevent creating superadmin role
        if (formData.name.toLowerCase() === 'superadmin') {
            setError('Superadmin role cannot be created. It already exists')
            setIsLoading(false)
            return
        }

        try {
            const cid = companyId ? JSON.parse(companyId) : null;
            if (!cid) {
                setError('Company ID not found. Please refresh the page and try again.')
                setIsLoading(false)
                return
            }

            const response = await crmInstance.post(`/roles/${cid}`, formData)

            if (response.data) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Role created successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })

                router.push('/roles/list')
            }
        } catch (err) {
            console.error('Failed to create role:', err)
            setError(err.response?.data?.message || 'Failed to create role')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="create-roles" redirect={false}>
            <PageHeader>
                {/* <UsersCreateHeader /> */}
            </PageHeader>

            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        {/* Hero Section */}
                        
                          
                        

                        {/* Main Form Card */}
                        <div className="card shadow-lg border-0"
                             style={{
                                 borderRadius: '20px',
                                 boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                             }}>
                                  <div className="card-body text-left text-white">
                             
                                <h2 className="card-title fw-bold text-dark">Create New Role</h2>
                        
                            </div>
                            <div className="card-body p-5">
                                {error && (
                                    <div className="alert alert-danger border-0 shadow-sm"
                                         style={{ borderRadius: '15px' }}>
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        {error}
                                    </div>
                                )}

                                {loadingPermissions && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <div className="text-center">
                                            <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                                            <p className="text-muted mt-3">Loading permissions...</p>
                                        </div>
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
                                                        disabled={isLoading}
                                                        required
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
                                   

                                    {/* Submit Button */}
                                    <div className="text-center">
                                        <button type="submit"
                                                className="btn btn-lg btn-primary"
                                                disabled={isLoading}
                                                style={{
                                                    background: ' #382f88',
                                                    border: 'none',
                                                    transition: 'all 0.3s ease',
                                                    float:'right'
                                                }}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                                                    Creating Role...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="m3 "/>
                                                    Create
                                                </>
                                            )}
                                        </button>
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

export default RolesCreatePage