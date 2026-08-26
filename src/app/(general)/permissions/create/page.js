'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersCreateHeader from '@/components/usersCreate/UsersCreateHeader'
import { FiSave, FiKey, FiFileText, FiShield } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import PermissionGuard from '@/components/shared/PermissionGuard';

const PermissionsCreatePage = () => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    })

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.post('/permissions', formData)

            if (response.data) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Permission created successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })

                router.push('/permissions/list')
            }
        } catch (err) {
            console.error('Failed to create permission:', err)
            setError(err.response?.data?.message || 'Failed to create permission')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="create-permissions" redirect={false}>
            <PageHeader>
                {/* <UsersCreateHeader /> */}
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
                               
                                <h2 className="card-title fw-bold text-dark">Create New Permission</h2>
                                
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
                                            <div className="bg-danger rounded-circle d-flex align-items-center justify-content-center me-3"
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
                                                        placeholder="Enter permission name (e.g., create-users)"
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
                                                        Permission Name <span className="text-danger">*</span>
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


                                    {/* Submit Button */}
                                    <div className="text-center">
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
                                                    Creating Permission...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-3" size={20} />
                                                    Create Permission
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

export default PermissionsCreatePage