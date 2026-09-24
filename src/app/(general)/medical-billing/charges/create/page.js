'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiDollarSign, FiPlus, FiTrash2 } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'

const emptyItem = { codeType: 'cpt', cpt_code_id: '', hcpcs_code_id: '', modifier_1: '', modifier_2: '', units: 1, charge_amount: '', diagnosis_pointer: '', place_of_service_id: '' }

const page = () => {
    const router = useRouter()
    const [encounterId, setEncounterId] = useState('')
    const [dosFrom, setDosFrom] = useState('')
    const [dosTo, setDosTo] = useState('')
    const [items, setItems] = useState([{ ...emptyItem }])

    const [encounters, setEncounters] = useState([])
    const [cptCodes, setCptCodes] = useState([])
    const [hcpcsCodes, setHcpcsCodes] = useState([])
    const [placesOfService, setPlacesOfService] = useState([])

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const [encRes, cptRes, hcpcsRes, posRes] = await Promise.all([
                    crmInstance.get('/medical-billing/encounters', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/cpt-codes', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/hcpcs-codes', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/place-of-services'),
                ])
                setEncounters(encRes.data?.data || [])
                setCptCodes(cptRes.data?.data || [])
                setHcpcsCodes(hcpcsRes.data?.data || [])
                setPlacesOfService(posRes.data?.data || [])
            } catch {
                // dropdowns stay empty
            }
        })()
    }, [])

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it))
    }

    const addItem = () => setItems(prev => [...prev, { ...emptyItem }])
    const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))

    const total = items.reduce((sum, it) => sum + (Number(it.units || 0) * Number(it.charge_amount || 0)), 0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const payload = {
                encounter_id: encounterId,
                dos_from: dosFrom,
                dos_to: dosTo || null,
                items: items.map(it => ({
                    cpt_code_id: it.codeType === 'cpt' ? it.cpt_code_id : null,
                    hcpcs_code_id: it.codeType === 'hcpcs' ? it.hcpcs_code_id : null,
                    modifier_1: it.modifier_1 || null,
                    modifier_2: it.modifier_2 || null,
                    units: it.units,
                    charge_amount: it.charge_amount,
                    diagnosis_pointer: it.diagnosis_pointer || null,
                    place_of_service_id: it.place_of_service_id || null,
                })),
            }
            const response = await crmInstance.post('/medical-billing/charges', payload)
            if (response.status === 201) {
                Swal.fire({
                    title: 'Success!', text: 'Charge created successfully!', icon: 'success',
                    confirmButtonText: 'OK', confirmButtonColor: '#007bff'
                }).then(() => router.push('/medical-billing/charges'))
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to create charge'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <PermissionGuard permission="medical_charges.manage" redirect={false}>
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
                                    <FiDollarSign /> New Charge
                                </h2>
                            </div>
                            <div className="card-body pt-0">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Encounter <span className="text-danger">*</span></label>
                                            <select className="form-select" value={encounterId} onChange={(e) => setEncounterId(e.target.value)} required disabled={isLoading}>
                                                <option value="">Select encounter</option>
                                                {encounters.map(enc => (
                                                    <option key={enc.id} value={enc.id}>
                                                        {enc.encounter_number} — {enc.patient ? `${enc.patient.first_name} ${enc.patient.last_name}` : ''} ({enc.encounter_date})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">DOS From <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" value={dosFrom} onChange={(e) => setDosFrom(e.target.value)} required disabled={isLoading} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">DOS To</label>
                                            <input type="date" className="form-control" value={dosTo} onChange={(e) => setDosTo(e.target.value)} disabled={isLoading} />
                                        </div>
                                    </div>

                                    <h5 className="mb-3">Service Lines</h5>
                                    {items.map((item, index) => (
                                        <div key={index} className="border rounded p-3 mb-3">
                                            <div className="row g-3">
                                                <div className="col-md-2">
                                                    <label className="form-label">Code Type</label>
                                                    <select className="form-select" value={item.codeType} onChange={(e) => updateItem(index, 'codeType', e.target.value)} disabled={isLoading}>
                                                        <option value="cpt">CPT</option>
                                                        <option value="hcpcs">HCPCS</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Code <span className="text-danger">*</span></label>
                                                    {item.codeType === 'cpt' ? (
                                                        <select className="form-select" value={item.cpt_code_id} onChange={(e) => updateItem(index, 'cpt_code_id', e.target.value)} required disabled={isLoading}>
                                                            <option value="">Select CPT</option>
                                                            {cptCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.description}</option>)}
                                                        </select>
                                                    ) : (
                                                        <select className="form-select" value={item.hcpcs_code_id} onChange={(e) => updateItem(index, 'hcpcs_code_id', e.target.value)} required disabled={isLoading}>
                                                            <option value="">Select HCPCS</option>
                                                            {hcpcsCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.description}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Mod 1</label>
                                                    <input type="text" className="form-control" value={item.modifier_1} onChange={(e) => updateItem(index, 'modifier_1', e.target.value)} disabled={isLoading} maxLength={10} />
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Mod 2</label>
                                                    <input type="text" className="form-control" value={item.modifier_2} onChange={(e) => updateItem(index, 'modifier_2', e.target.value)} disabled={isLoading} maxLength={10} />
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Units <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" min="0.01" className="form-control" value={item.units} onChange={(e) => updateItem(index, 'units', e.target.value)} required disabled={isLoading} />
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Amount <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" min="0" className="form-control" value={item.charge_amount} onChange={(e) => updateItem(index, 'charge_amount', e.target.value)} required disabled={isLoading} />
                                                </div>
                                                <div className="col-md-1 d-flex align-items-end">
                                                    {items.length > 1 && (
                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeItem(index)} disabled={isLoading}>
                                                            <FiTrash2 />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Diagnosis Pointer</label>
                                                    <input type="text" className="form-control" placeholder="e.g. A" value={item.diagnosis_pointer} onChange={(e) => updateItem(index, 'diagnosis_pointer', e.target.value)} disabled={isLoading} />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Place of Service</label>
                                                    <select className="form-select" value={item.place_of_service_id} onChange={(e) => updateItem(index, 'place_of_service_id', e.target.value)} disabled={isLoading}>
                                                        <option value="">Select</option>
                                                        {placesOfService.map(pos => <option key={pos.id} value={pos.id}>{pos.code} - {pos.description}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button type="button" className="btn btn-sm btn-outline-primary mb-4" onClick={addItem} disabled={isLoading}>
                                        <FiPlus className="me-1" /> Add Line
                                    </button>

                                    <div className="text-end mb-4">
                                        <strong>Total: ${total.toFixed(2)}</strong>
                                    </div>

                                    <div className="text-center">
                                        <button type="submit" className="btn btn-lg btn-primary" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave className="me-2" />
                                                    Create Charge
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
