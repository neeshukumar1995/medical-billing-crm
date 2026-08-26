'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiUserPlus } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyForm = {
    first_name: '',
    last_name: '',
    npi: '',
    taxonomy_code: '',
    specialty: '',
    tax_id: '',
    license_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
}

const page = () => {
    const router = useRouter()
    const [formData, setFormData] = useState(emptyForm)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.post('/medical-billing/providers', formData)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Provider created successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/providers')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '))
            } else {
                setError(err.response?.data?.message || 'Failed to create provider')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_providers.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary">
                        <i className="me-2">⬅️</i>
                        Back
                    </button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FiUserPlus /> Add Provider
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label">First Name <span className="text-danger">*</span></label>
                                            <input type="text" name="first_name" className="form-control" value={formData.first_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Last Name <span className="text-danger">*</span></label>
                                            <input type="text" name="last_name" className="form-control" value={formData.last_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">NPI</label>
                                            <input type="text" name="npi" className="form-control" value={formData.npi} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Taxonomy Code</label>
                                            <input type="text" name="taxonomy_code" className="form-control" value={formData.taxonomy_code} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Specialty</label>
                                            <input type="text" name="specialty" className="form-control" value={formData.specialty} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Tax ID</label>
                                            <input type="text" name="tax_id" className="form-control" value={formData.tax_id} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">License Number</label>
                                            <input type="text" name="license_number" className="form-control" value={formData.license_number} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Email</label>
                                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Address</label>
                                            <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">City</label>
                                            <input type="text" name="city" className="form-control" value={formData.city} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">State</label>
                                            <input type="text" name="state" className="form-control" value={formData.state} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Zip Code</label>
                                            <input type="text" name="zip_code" className="form-control" value={formData.zip_code} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                    </div>

                                    <div className="text-center mt-5">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Create Provider
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

export default page
