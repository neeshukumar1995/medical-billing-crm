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

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [formData, setFormData] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', status: 'active' })
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setIsFetching(true)
                const response = await crmInstance.get('/medical-billing/vendors', { params: { per_page: 1000 } })
                const list = response.data?.data || []
                const v = list.find(x => String(x.id) === String(actualId))
                if (!v) throw new Error('Vendor not found')
                setFormData({ name: v.name || '', contact_name: v.contact_name || '', phone: v.phone || '', email: v.email || '', address: v.address || '', status: v.status || 'active' })
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to load vendor.')
            } finally {
                setIsFetching(false)
            }
        }
        if (actualId) load()
    }, [actualId])

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            const response = await crmInstance.put(`/medical-billing/vendors/${actualId}`, formData)
            if (response.status === 200) {
                Swal.fire({ title: 'Success!', text: 'Vendor updated successfully!', icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#007bff' })
                    .then(() => router.push('/medical-billing/vendors'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update vendor'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                            <div className="card-body">
                                <h2 className="card-title fw-bold text-dark d-flex align-items-center gap-2"><FiEdit3 /> Edit Vendor</h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}
                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5"><Spinner label="Loading vendor..." variant="spinner" /></div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className="row g-4">
                                            <div className="col-md-6">
                                                <label className="form-label">Vendor Name <span className="text-danger">*</span></label>
                                                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Contact Name</label>
                                                <input type="text" name="contact_name" className="form-control" value={formData.contact_name} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Phone</label>
                                                <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Email</label>
                                                <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-8">
                                                <label className="form-label">Address</label>
                                                <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Status</label>
                                                <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="text-center mt-5 d-flex gap-3 justify-content-center">
                                            <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                                {isLoading ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</> : <><FiSave className="me-2" />Update Vendor</>}
                                            </button>
                                            <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/vendors')} disabled={isLoading}>Cancel</button>
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
