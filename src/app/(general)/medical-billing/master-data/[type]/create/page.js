'use client'
import React, { useState } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiSave, FiPlus } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { MEDICAL_CODE_MASTERS } from '@/utils/medicalCodeMasters'

const page = () => {
    const params = useParams()
    const router = useRouter()
    const config = MEDICAL_CODE_MASTERS[params.type]

    const [formData, setFormData] = useState({ code: '', description: '', status: 'active', ...(config?.extraField ? { [config.extraField.name]: '' } : {}) })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    if (!config) return notFound()

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.post(config.endpoint, formData)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!',
                    text: `${config.label.replace(/s$/, '')} created successfully!`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push(`/medical-billing/master-data/${params.type}`)
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to create record'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_coding.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FiPlus /> Add {config.label.replace(/s$/, '')}
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label">Code <span className="text-danger">*</span></label>
                                            <input type="text" name="code" className="form-control" value={formData.code} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-8">
                                            <label className="form-label">Description <span className="text-danger">*</span></label>
                                            <input type="text" name="description" className="form-control" value={formData.description} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        {config.extraField && (
                                            <div className="col-md-6">
                                                <label className="form-label">{config.extraField.label}</label>
                                                <input type="text" name={config.extraField.name} className="form-control" placeholder={config.extraField.placeholder} value={formData[config.extraField.name]} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                        )}
                                        <div className="col-md-6">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
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

export default page
