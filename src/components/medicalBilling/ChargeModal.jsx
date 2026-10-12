'use client'
import React, { useState, useEffect } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { FiEdit3, FiFileText, FiX, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi'
import Spinner from '@/components/shared/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { toInputDate, formatDate } from '@/utils/formatDate'

const STATUS_COLORS = { draft: 'secondary', ready: 'info', billed: 'success', voided: 'danger' }

const Field = ({ label, value }) => (
    <div className="col-md-4">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted">—</span>}</div>
    </div>
)

const emptyItem = { codeType: 'cpt', cpt_code_id: '', hcpcs_code_id: '', modifier_1: '', modifier_2: '', units: 1, charge_amount: '', diagnosis_pointer: '', place_of_service_id: '' }

const toItemsFormState = (charge) => (charge.items || []).map(it => ({
    codeType: it.cpt_code_id ? 'cpt' : 'hcpcs',
    cpt_code_id: it.cpt_code_id || '',
    hcpcs_code_id: it.hcpcs_code_id || '',
    modifier_1: it.modifier_1 || '',
    modifier_2: it.modifier_2 || '',
    units: it.units,
    charge_amount: it.charge_amount,
    diagnosis_pointer: it.diagnosis_pointer || '',
    place_of_service_id: it.place_of_service_id || '',
}))

export default function ChargeModal({ chargeId, onClose, onSaved, initialMode = 'view' }) {
    const { hasPermission } = usePermissions()

    const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
    const [charge, setCharge] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [cptCodes, setCptCodes] = useState([])
    const [hcpcsCodes, setHcpcsCodes] = useState([])
    const [placesOfService, setPlacesOfService] = useState([])

    const [dosFrom, setDosFrom] = useState('')
    const [dosTo, setDosTo] = useState('')
    const [items, setItems] = useState([{ ...emptyItem }])
    const [isSaving, setIsSaving] = useState(false)

    const loadAll = async () => {
        try {
            setLoading(true)
            const [chargeRes, cptRes, hcpcsRes, posRes] = await Promise.all([
                crmInstance.get(`/medical-billing/charges/${chargeId}`),
                crmInstance.get('/medical-billing/cpt-codes', { params: { per_page: 500 } }),
                crmInstance.get('/medical-billing/hcpcs-codes', { params: { per_page: 500 } }),
                crmInstance.get('/medical-billing/place-of-services'),
            ])
            const c = chargeRes.data
            setCharge(c)
            setDosFrom(toInputDate(c.dos_from))
            setDosTo(toInputDate(c.dos_to))
            setItems(toItemsFormState(c).length ? toItemsFormState(c) : [{ ...emptyItem }])
            setCptCodes(cptRes.data?.data || [])
            setHcpcsCodes(hcpcsRes.data?.data || [])
            setPlacesOfService(posRes.data?.data || [])
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load charge data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (chargeId) loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chargeId])

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it))
    }
    const addItem = () => setItems(prev => [...prev, { ...emptyItem }])
    const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))
    const editTotal = items.reduce((sum, it) => sum + (Number(it.units || 0) * Number(it.charge_amount || 0)), 0)

    const handleEditClick = () => {
        if (charge) {
            setDosFrom(toInputDate(charge.dos_from))
            setDosTo(toInputDate(charge.dos_to))
            setItems(toItemsFormState(charge).length ? toItemsFormState(charge) : [{ ...emptyItem }])
        }
        setError('')
        setMode('edit')
    }

    const handleCancelEdit = () => {
        if (charge) {
            setDosFrom(toInputDate(charge.dos_from))
            setDosTo(toInputDate(charge.dos_to))
            setItems(toItemsFormState(charge).length ? toItemsFormState(charge) : [{ ...emptyItem }])
        }
        setError('')
        setMode('view')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setError('')

        try {
            const payload = {
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
            const response = await crmInstance.put(`/medical-billing/charges/${chargeId}`, payload)
            if (response.status === 200) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Charge updated successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#007bff'
                })
                await loadAll()
                setMode('view')
                onSaved && onSaved()
            }
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to update charge'))
        } finally {
            setIsSaving(false)
        }
    }

    const codeLabel = (item) => {
        if (item.cpt_code_id) {
            const c = cptCodes.find(x => String(x.id) === String(item.cpt_code_id))
            return c ? `${c.code} - ${c.description}` : 'N/A'
        }
        if (item.hcpcs_code_id) {
            const c = hcpcsCodes.find(x => String(x.id) === String(item.hcpcs_code_id))
            return c ? `${c.code} - ${c.description}` : 'N/A'
        }
        return 'N/A'
    }
    const posLabel = (item) => {
        const pos = placesOfService.find(x => String(x.id) === String(item.place_of_service_id))
        return pos ? `${pos.code} - ${pos.description}` : 'N/A'
    }
    const modifiersLabel = (item) => [item.modifier_1, item.modifier_2].filter(Boolean).join(', ') || 'N/A'

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                                <FiFileText />
                                {mode === 'edit' ? 'Edit Charge' : 'Charge Details'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>

                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            {loading ? (
                                <div className="d-flex justify-content-center py-5">
                                    <Spinner label="Loading charge..." variant="spinner" />
                                </div>
                            ) : !charge ? null : mode === 'view' ? (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-0">
                                                {charge.patient ? `${charge.patient.first_name} ${charge.patient.last_name}` : 'Charge'}
                                                <span className={`badge bg-soft-${STATUS_COLORS[charge.status] || 'secondary'} text-${STATUS_COLORS[charge.status] || 'secondary'} text-capitalize ms-2`}>
                                                    {charge.status}
                                                </span>
                                            </h4>
                                            <p className="text-muted mb-0">Encounter: {charge.encounter?.encounter_number || 'N/A'}</p>
                                        </div>
                                        {hasPermission('medical_charges.manage') && charge.status !== 'billed' && (
                                            <button type="button" className="btn btn-primary" onClick={handleEditClick}>
                                                <FiEdit3 className="me-2" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4 mb-3">
                                        <Field label="Provider" value={charge.provider ? `${charge.provider.first_name} ${charge.provider.last_name}` : null} />
                                        <Field label="DOS From" value={formatDate(charge.dos_from)} />
                                        <Field label="DOS To" value={formatDate(charge.dos_to)} />
                                        <Field label="Total Charge" value={`$${Number(charge.total_charge).toFixed(2)}`} />
                                    </div>

                                    <hr />
                                    <h6 className="mb-3">Service Lines</h6>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Modifiers</th>
                                                    <th>Units</th>
                                                    <th>Amount</th>
                                                    <th>Dx Ptr</th>
                                                    <th>POS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(charge.items || []).map((item, idx) => (
                                                    <tr key={item.id || idx}>
                                                        <td>{codeLabel(item)}</td>
                                                        <td>{modifiersLabel(item)}</td>
                                                        <td>{item.units}</td>
                                                        <td>${Number(item.charge_amount).toFixed(2)}</td>
                                                        <td>{item.diagnosis_pointer || 'N/A'}</td>
                                                        <td>{posLabel(item)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <form id="charge-modal-form" onSubmit={handleSubmit}>
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label">DOS From <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" value={dosFrom} onChange={(e) => setDosFrom(e.target.value)} required disabled={isSaving} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">DOS To</label>
                                            <input type="date" className="form-control" value={dosTo} onChange={(e) => setDosTo(e.target.value)} disabled={isSaving} />
                                        </div>
                                    </div>

                                    <h6 className="mb-3">Service Lines</h6>
                                    {items.map((item, index) => (
                                        <div key={index} className="border rounded p-3 mb-3">
                                            <div className="row g-3">
                                                <div className="col-md-2">
                                                    <label className="form-label">Code Type</label>
                                                    <select className="form-select" value={item.codeType} onChange={(e) => updateItem(index, 'codeType', e.target.value)} disabled={isSaving}>
                                                        <option value="cpt">CPT</option>
                                                        <option value="hcpcs">HCPCS</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Code <span className="text-danger">*</span></label>
                                                    {item.codeType === 'cpt' ? (
                                                        <select className="form-select" value={item.cpt_code_id} onChange={(e) => updateItem(index, 'cpt_code_id', e.target.value)} required disabled={isSaving}>
                                                            <option value="">Select CPT</option>
                                                            {cptCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.description}</option>)}
                                                        </select>
                                                    ) : (
                                                        <select className="form-select" value={item.hcpcs_code_id} onChange={(e) => updateItem(index, 'hcpcs_code_id', e.target.value)} required disabled={isSaving}>
                                                            <option value="">Select HCPCS</option>
                                                            {hcpcsCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.description}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Mod 1</label>
                                                    <input type="text" className="form-control" value={item.modifier_1} onChange={(e) => updateItem(index, 'modifier_1', e.target.value)} disabled={isSaving} maxLength={10} />
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Mod 2</label>
                                                    <input type="text" className="form-control" value={item.modifier_2} onChange={(e) => updateItem(index, 'modifier_2', e.target.value)} disabled={isSaving} maxLength={10} />
                                                </div>
                                                <div className="col-md-1">
                                                    <label className="form-label">Units <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" min="0.01" className="form-control" value={item.units} onChange={(e) => updateItem(index, 'units', e.target.value)} required disabled={isSaving} />
                                                </div>
                                                <div className="col-md-2">
                                                    <label className="form-label">Amount <span className="text-danger">*</span></label>
                                                    <input type="number" step="0.01" min="0" className="form-control" value={item.charge_amount} onChange={(e) => updateItem(index, 'charge_amount', e.target.value)} required disabled={isSaving} />
                                                </div>
                                                <div className="col-md-1 d-flex align-items-end">
                                                    {items.length > 1 && (
                                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeItem(index)} disabled={isSaving}>
                                                            <FiTrash2 />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Diagnosis Pointer</label>
                                                    <input type="text" className="form-control" placeholder="e.g. A" value={item.diagnosis_pointer} onChange={(e) => updateItem(index, 'diagnosis_pointer', e.target.value)} disabled={isSaving} />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Place of Service</label>
                                                    <select className="form-select" value={item.place_of_service_id} onChange={(e) => updateItem(index, 'place_of_service_id', e.target.value)} disabled={isSaving}>
                                                        <option value="">Select</option>
                                                        {placesOfService.map(pos => <option key={pos.id} value={pos.id}>{pos.code} - {pos.description}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button type="button" className="btn btn-sm btn-outline-primary mb-3" onClick={addItem} disabled={isSaving}>
                                        <FiPlus className="me-1" /> Add Line
                                    </button>

                                    <div className="text-end">
                                        <strong>Total: ${editTotal.toFixed(2)}</strong>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="modal-footer">
                            {mode === 'edit' ? (
                                <>
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                                        Cancel
                                    </button>
                                    <button type="submit" form="charge-modal-form" className="btn btn-primary" disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="me-2" />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                                    <FiX className="me-2" />
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}
