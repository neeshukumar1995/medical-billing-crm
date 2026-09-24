'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiUserPlus, FiUser } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyForm = {
    patient_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    status: 'active',
    assigned_to: '',
}

const page = () => {
    const router = useRouter()
    const [formData, setFormData] = useState(emptyForm)
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Employee picker for "Assigned To" — same /users/{companyId} lookup
    // used across the app's other user pickers.
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const companyId = localStorage.getItem('companyId')
                const cid = companyId ? JSON.parse(companyId) : null
                if (!cid) return
                const response = await crmInstance.get(`/users/${cid}`, { params: { all: 1 } })
                const usersData = response.data
                setUsers(Array.isArray(usersData) ? usersData : (usersData?.data || []))
            } catch (err) {
                console.error('Failed to fetch users:', err)
            }
        }
        fetchUsers()
    }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await crmInstance.post('/medical-billing/patients', formData)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Patient created successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/patients')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '))
            } else {
                setError(err.response?.data?.message || 'Failed to create patient')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_patients.create" redirect={false}>
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
                                    <FiUserPlus /> Add Patient
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <label className="form-label">Patient Number <span className="text-danger">*</span></label>
                                            <input type="text" name="patient_number" className="form-control" value={formData.patient_number} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">First Name <span className="text-danger">*</span></label>
                                            <input type="text" name="first_name" className="form-control" value={formData.first_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Middle Name</label>
                                            <input type="text" name="middle_name" className="form-control" value={formData.middle_name} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Last Name <span className="text-danger">*</span></label>
                                            <input type="text" name="last_name" className="form-control" value={formData.last_name} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                                            <input type="date" name="date_of_birth" className="form-control" value={formData.date_of_birth} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Gender</label>
                                            <select name="gender" className="form-select" value={formData.gender} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="">Select</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Phone</label>
                                            <input type="text" name="phone" className="form-control" value={formData.phone} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Email</label>
                                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="deceased">Deceased</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label d-flex align-items-center gap-1"><FiUser size={14} /> Assigned To</label>
                                            <select name="assigned_to" className="form-select" value={formData.assigned_to} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="">Unassigned</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
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
                                            <label className="form-label">Emergency Contact Name</label>
                                            <input type="text" name="emergency_contact_name" className="form-control" value={formData.emergency_contact_name} onChange={handleInputChange} disabled={isLoading} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Emergency Contact Phone</label>
                                            <input type="text" name="emergency_contact_phone" className="form-control" value={formData.emergency_contact_phone} onChange={handleInputChange} disabled={isLoading} />
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
                                                    Create Patient
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
