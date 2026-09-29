'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiClipboard } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyForm = {
    patient_id: '',
    provider_id: '',
    encounter_date: '',
    place_of_service_id: '',
    status: 'open',
    notes: '',
}

const page = () => {
    const router = useRouter()
    const [formData, setFormData] = useState(emptyForm)
    const [patients, setPatients] = useState([])
    const [providers, setProviders] = useState([])
    const [placesOfService, setPlacesOfService] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const [pRes, drRes, posRes] = await Promise.all([
                    crmInstance.get('/medical-billing/patients', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/providers', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/place-of-services'),
                ])
                setPatients(pRes.data?.data || [])
                setProviders(drRes.data?.data || [])
                setPlacesOfService(posRes.data?.data || [])
            } catch {
                // dropdowns just stay empty
            }
        })()
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
            const response = await crmInstance.post('/medical-billing/encounters', formData)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Encounter created successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/encounters')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to create encounter'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_encounters.manage" redirect={false}>
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
                                    <FiClipboard /> Add Encounter
                                </h2>
                                <p className="text-muted small mb-0">Encounter # is generated automatically.</p>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Patient <span className="text-danger">*</span></label>
                                            <select name="patient_id" className="form-select" value={formData.patient_id} onChange={handleInputChange} required disabled={isLoading}>
                                                <option value="">Select patient</option>
                                                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Provider <span className="text-danger">*</span></label>
                                            <select name="provider_id" className="form-select" value={formData.provider_id} onChange={handleInputChange} required disabled={isLoading}>
                                                <option value="">Select provider</option>
                                                {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Encounter Date <span className="text-danger">*</span></label>
                                            <input type="date" name="encounter_date" className="form-control" value={formData.encounter_date} onChange={handleInputChange} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Place of Service</label>
                                            <select name="place_of_service_id" className="form-select" value={formData.place_of_service_id} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="">Select</option>
                                                {placesOfService.map(pos => <option key={pos.id} value={pos.id}>{pos.code} - {pos.description}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleInputChange} disabled={isLoading}>
                                                <option value="open">Open</option>
                                                <option value="coding">Coding</option>
                                                <option value="ready">Ready</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Notes</label>
                                            <textarea name="notes" className="form-control" rows={3} value={formData.notes} onChange={handleInputChange} disabled={isLoading} />
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
                                                    Create Encounter
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
