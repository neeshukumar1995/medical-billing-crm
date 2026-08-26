'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiEdit3 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'

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
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [formData, setFormData] = useState(emptyForm)
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get(`/medical-billing/providers/${actualId}`)
                const p = response.data
                setFormData({
                    first_name: p.first_name || '',
                    last_name: p.last_name || '',
                    npi: p.npi || '',
                    taxonomy_code: p.taxonomy_code || '',
                    specialty: p.specialty || '',
                    tax_id: p.tax_id || '',
                    license_number: p.license_number || '',
                    phone: p.phone || '',
                    email: p.email || '',
                    address: p.address || '',
                    city: p.city || '',
                    state: p.state || '',
                    zip_code: p.zip_code || '',
                })
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load provider data.')
            } finally {
                setIsFetching(false)
            }
        }

        if (actualId) fetchProvider()
    }, [actualId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.put(`/medical-billing/providers/${actualId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Provider updated successfully!',
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
                setError(err.response?.data?.message || 'Failed to update provider')
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
                                    <FiEdit3 /> Edit Provider
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5">
                                        <Spinner label="Loading provider..." variant="spinner" />
                                    </div>
                                ) : (
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

                                        <div className="text-center mt-5 d-flex gap-3 justify-content-center">
                                            <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                                {isLoading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Updating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiSave className="me-2" />
                                                        Update Provider
                                                    </>
                                                )}
                                            </button>
                                            <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/providers')} disabled={isLoading}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
