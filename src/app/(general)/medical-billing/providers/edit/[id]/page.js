'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiEdit3, FiPlus, FiTrash2 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import { decryptId } from '@/utils/decryptId'
import { PROVIDER_TYPE_OPTIONS } from '@/constants/providerOptions'

const emptyForm = {
    first_name: '',
    last_name: '',
    npi: '',
    taxonomy_code: '',
    specialty: '',
    provider_type: '',
    tax_id: '',
    license_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    mailing_address: '',
    billing_address: '',
    notes: '',
    assigned_user_id: '',
}

const emptyContact = { name: '', role_title: '', phone: '', email: '', notes: '' }

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [formData, setFormData] = useState(emptyForm)
    const [contacts, setContacts] = useState([{ ...emptyContact }])
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const rawCid = localStorage.getItem('companyId')
                const cid = rawCid ? JSON.parse(rawCid) : null
                if (!cid) return
                const response = await crmInstance.get(`/users/${cid}`, { params: { all: 1 } })
                const userList = response.data
                setUsers(Array.isArray(userList) ? userList : [])
            } catch {
                // dropdown stays empty
            }
        })()
    }, [])

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
                    provider_type: p.provider_type || '',
                    tax_id: p.tax_id || '',
                    license_number: p.license_number || '',
                    phone: p.phone || '',
                    email: p.email || '',
                    address: p.address || '',
                    city: p.city || '',
                    state: p.state || '',
                    zip_code: p.zip_code || '',
                    mailing_address: p.mailing_address || '',
                    billing_address: p.billing_address || '',
                    notes: p.notes || '',
                    assigned_user_id: p.assigned_user_id || '',
                })
                setContacts(p.contacts?.length ? p.contacts : [{ ...emptyContact }])
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

    const updateContact = (index, field, value) => {
        setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
    }
    const addContact = () => setContacts(prev => [...prev, { ...emptyContact }])
    const removeContact = (index) => setContacts(prev => prev.filter((_, i) => i !== index))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                ...formData,
                assigned_user_id: formData.assigned_user_id || null,
                contacts: contacts
                    .filter(c => c.name)
                    .map(c => ({
                        name: c.name,
                        role_title: c.role_title || null,
                        phone: c.phone || null,
                        email: c.email || null,
                        notes: c.notes || null,
                    })),
            }
            const response = await crmInstance.put(`/medical-billing/providers/${actualId}`, payload)
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
                                                <label className="form-label">Provider Type</label>
                                                <select name="provider_type" className="form-select" value={formData.provider_type} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="">Select type</option>
                                                    {PROVIDER_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
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
                                            <div className="col-md-6">
                                                <label className="form-label">Mailing Address</label>
                                                <textarea name="mailing_address" rows={2} className="form-control" value={formData.mailing_address} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Billing Address</label>
                                                <textarea name="billing_address" rows={2} className="form-control" value={formData.billing_address} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Assigned Team Member</label>
                                                <select name="assigned_user_id" className="form-select" value={formData.assigned_user_id} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="">Unassigned</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-12">
                                                <label className="form-label">Notes</label>
                                                <textarea name="notes" rows={4} className="form-control" value={formData.notes} onChange={handleInputChange} disabled={isLoading} />
                                            </div>
                                        </div>

                                        <h5 className="mt-4 mb-3">Additional Contacts</h5>
                                        {contacts.map((c, index) => (
                                            <div key={index} className="border rounded p-3 mb-3">
                                                <div className="row g-3">
                                                    <div className="col-md-3">
                                                        <label className="form-label">Name</label>
                                                        <input type="text" className="form-control" value={c.name} onChange={(e) => updateContact(index, 'name', e.target.value)} disabled={isLoading} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Role / Title</label>
                                                        <input type="text" className="form-control" value={c.role_title} onChange={(e) => updateContact(index, 'role_title', e.target.value)} disabled={isLoading} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Phone</label>
                                                        <input type="text" className="form-control" value={c.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} disabled={isLoading} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Email</label>
                                                        <input type="email" className="form-control" value={c.email} onChange={(e) => updateContact(index, 'email', e.target.value)} disabled={isLoading} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label">Notes</label>
                                                        <textarea className="form-control" rows={2} value={c.notes} onChange={(e) => updateContact(index, 'notes', e.target.value)} disabled={isLoading} />
                                                    </div>
                                                    <div className="col-md-1 d-flex align-items-end">
                                                        {contacts.length > 1 && (
                                                            <button type="button" className="btn btn-outline-danger" onClick={() => removeContact(index)} disabled={isLoading}>
                                                                <FiTrash2 />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" className="btn btn-sm btn-outline-primary mb-4" onClick={addContact} disabled={isLoading}>
                                            <FiPlus className="me-1" /> Add Contact
                                        </button>

                                        <div className="text-center mt-2 d-flex gap-3 justify-content-center">
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
