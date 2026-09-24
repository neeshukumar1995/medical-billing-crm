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
import { toInputDate } from '@/utils/formatDate'

const emptyForm = {
    provider_id: '',
    encounter_date: '',
    place_of_service_id: '',
    status: 'open',
    notes: '',
}

const page = () => {
    const router = useRouter()
    const params = useParams()
    const actualId = useMemo(() => decryptId(params.id), [params.id])

    const [formData, setFormData] = useState(emptyForm)
    const [encounterNumber, setEncounterNumber] = useState('')
    const [patientName, setPatientName] = useState('')
    const [providers, setProviders] = useState([])
    const [placesOfService, setPlacesOfService] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setIsFetching(true)
                const [encRes, drRes, posRes] = await Promise.all([
                    crmInstance.get(`/medical-billing/encounters/${actualId}`),
                    crmInstance.get('/medical-billing/providers', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/place-of-services'),
                ])
                const e = encRes.data
                setEncounterNumber(e.encounter_number)
                setPatientName(e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : '')
                setFormData({
                    provider_id: e.provider_id || '',
                    encounter_date: toInputDate(e.encounter_date),
                    place_of_service_id: e.place_of_service_id || '',
                    status: e.status || 'open',
                    notes: e.notes || '',
                })
                setProviders(drRes.data?.data || [])
                setPlacesOfService(posRes.data?.data || [])
                setError('')
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load encounter data.')
            } finally {
                setIsFetching(false)
            }
        }

        if (actualId) load()
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
            const response = await crmInstance.put(`/medical-billing/encounters/${actualId}`, formData)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Encounter updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                }).then(() => {
                    router.push('/medical-billing/encounters')
                })
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update encounter'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_encounters.manage" redirect={false}>
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
                                    <FiEdit3 /> Edit Encounter
                                </h2>
                                {!isFetching && (
                                    <p className="text-muted small mb-0">{encounterNumber} — {patientName}</p>
                                )}
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {isFetching ? (
                                    <div className="d-flex justify-content-center py-5">
                                        <Spinner label="Loading encounter..." variant="spinner" />
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className="row g-4">
                                            <div className="col-md-6">
                                                <label className="form-label">Provider <span className="text-danger">*</span></label>
                                                <select name="provider_id" className="form-select" value={formData.provider_id} onChange={handleInputChange} required disabled={isLoading}>
                                                    <option value="">Select provider</option>
                                                    {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Encounter Date <span className="text-danger">*</span></label>
                                                <input type="date" name="encounter_date" className="form-control" value={formData.encounter_date} onChange={handleInputChange} required disabled={isLoading} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Place of Service</label>
                                                <select name="place_of_service_id" className="form-select" value={formData.place_of_service_id} onChange={handleInputChange} disabled={isLoading}>
                                                    <option value="">Select</option>
                                                    {placesOfService.map(pos => <option key={pos.id} value={pos.id}>{pos.code} - {pos.description}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
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
                                                        Update Encounter
                                                    </>
                                                )}
                                            </button>
                                            <button type="button" className="btn btn-lg btn-outline-secondary" onClick={() => router.push('/medical-billing/encounters')} disabled={isLoading}>
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
