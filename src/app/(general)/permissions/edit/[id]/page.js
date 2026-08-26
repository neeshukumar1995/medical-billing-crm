'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { useRouter, useParams } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import { FiSave, FiKey, FiFileText, FiShield, FiEdit3, FiX } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { decryptId } from '@/utils/decryptId'

const EditPermissionPage = () => {
    const router = useRouter()
    const { id } = useParams()
    const actualId = useMemo(() => decryptId(id), [id])

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [error, setError] = useState('')

    // Fetch permission data on component mount
    useEffect(() => {
        if (!actualId) return

        const fetchPermission = async () => {
            try {
                setIsLoadingData(true)
                const response = await crmInstance.get(`/permissions/${actualId}`)
                const permissionData = response.data.data || response.data

                setFormData({
                    name: permissionData.name || '',
                    description: permissionData.description || ''
                })
            } catch (err) {
                console.error('Failed to fetch permission:', err)
                setError('Failed to load permission data')
            } finally {
                setIsLoadingData(false)
            }
        }

        fetchPermission()
    }, [actualId])

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.put(`/permissions/${actualId}`, formData)

            if (response.data?.status) {
                Swal.fire({
                    title: 'Success!',
                    text: response.data?.message || 'Permission updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/permissions/list')
                })
            }
        } catch (err) {
            console.error('Permission update failed:', err)
            setError(err.response?.data?.message || 'Failed to update permission')
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoadingData) {
        return (
           <PermissionGuard permission="edit-permissions" redirect={false}>
                <PageHeader>
                    <UsersHeader />
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
        <PermissionGuard permission="edit-permissions" redirect={false}>
            <PageHeader>
                {/* <UsersHeader /> */}
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
                               
                                <h2 className="card-title fw-bold text-dark">Edit Permission</h2>
                               
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
                                    {/* Permission Information Section */}
                                    <div className="mb-5">
                                        <div className="d-flex align-items-center mb-4">
                                            <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center me-3"
                                                 style={{ width: '40px', height: '40px' }}>
                                                <FiShield className="text-white" size={20} />
                                            </div>
                                            <h4 className="mb-0 fw-bold text-dark">Permission Information</h4>
                                        </div>

                                        <div className="row g-5">
                                            <div className="col-md-6">
                                                <div className="position-relative">
                                                    <FiKey className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        className="form-control shadow-sm ps-5"
                                                        placeholder="Enter permission name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
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
                                                        Permission Name <span className="text-danger">*</span>
                                                    </label>
                                                </div>
                                                <small className="form-text text-muted ms-3 mt-1">
                                                    Use lowercase with hyphens (e.g., view-users, create-roles)
                                                </small>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="position-relative">
                                                    <FiFileText className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                                    <input
                                                        type="text"
                                                        name="description"
                                                        className="form-control shadow-sm ps-5"
                                                        placeholder="Enter permission description"
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


                                    {/* Action Buttons */}
                                    <div className="text-center">
                                        <div className="d-flex gap-3 justify-content-center">
                                            <button type="submit"
                                                    className="btn btn-primary btn-lg px-5 py-3 fw-bold shadow-lg"
                                                    disabled={isLoading}
                                                    style={{
                                                       
                                                        background: '#382f88',
                                                        border: 'none',
                                                       
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                {isLoading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                                                        Updating Permission...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave className="me-3" size={20} />
                                                        Update Permission
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-lg btn-primary"
                                                onClick={() => router.push('/permissions/list')}
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

export default EditPermissionPage