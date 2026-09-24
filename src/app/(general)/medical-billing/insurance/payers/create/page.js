'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiPlus } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyForm = {
    name: '',
    payer_id: '',
    payer_type: '',
    phone: '',
    address: '',
    website: '',
    status: 'active',
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
            const response = await crmInstance.post('/medical-billing/insurance/payers', formData)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Payer created successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/insurance/payers')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '))
            } else {
                setError(err.response?.data?.message || 'Failed to create payer')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_insurance.manage" redirect={false}>
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
                                    <FiPlus /> Add Insurance Payer
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Payer Name <span className="text-danger">*</span></label>
                                            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Payer ID</label>
                                            <input type="text" name="payer_id" className="form-control" value={formData.payer_id} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Payer Type</label>
                                            <select name="payer_type" className="form-select" value={formData.payer_type} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="">Select</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="medicare">Medicare</option>
                                                <option value="medicaid">Medicaid</option>
                                                <option value="workers_comp">Workers' Comp</option>
                                                <option value="self_pay">Self Pay</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Website</label>
                                            <input type="text" name="website" className="form-control" value={formData.website} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Address</label>
                                            <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isLoading} />
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
                                                    Create Payer
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
