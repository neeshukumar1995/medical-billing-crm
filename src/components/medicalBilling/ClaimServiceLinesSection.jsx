'use client'
import React, { useState, useEffect } from 'react'
import { FiPlus, FiEdit3, FiTrash2, FiSave, FiX } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import { formatDate, toInputDate, todayInputDate } from '@/utils/formatDate'

const emptyForm = (defaultDos = '') => ({
    dos_from: defaultDos || todayInputDate(),
    cpt_hcpcs_code: '',
    modifiers: '',
    units: '1.00',
    charge_amount: '',
    diagnosis_pointer: 'A',
    place_of_service: '11',
})

export default function ClaimServiceLinesSection({
    claim,
    claimId,
    onClaimUpdated,
    compact = false,
}) {
    const resolvedClaimId = claimId || claim?.id
    const items = claim?.items || []
    const defaultDos = items[0]?.dos_from ? toInputDate(items[0].dos_from) : todayInputDate()

    const [showForm, setShowForm] = useState(false)
    const [editingItemId, setEditingItemId] = useState(null)
    const [form, setForm] = useState(() => emptyForm(defaultDos))
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [codeSuggestions, setCodeSuggestions] = useState([])

    useEffect(() => {
        if (!showForm || codeSuggestions.length > 0) return
        let active = true
        const loadCodes = async () => {
            try {
                const [cptRes, hcpcsRes] = await Promise.allSettled([
                    crmInstance.get('/medical-billing/cpt-codes', { params: { per_page: 500 } }),
                    crmInstance.get('/medical-billing/hcpcs-codes', { params: { per_page: 500 } }),
                ])
                if (!active) return
                const cpts = cptRes.status === 'fulfilled' ? (cptRes.value.data?.data || []) : []
                const hcpcs = hcpcsRes.status === 'fulfilled' ? (hcpcsRes.value.data?.data || []) : []
                setCodeSuggestions([...cpts, ...hcpcs])
            } catch {
                // optional suggestions
            }
        }
        loadCodes()
        return () => { active = false }
    }, [showForm, codeSuggestions.length])

    const handleOpenAdd = () => {
        setEditingItemId(null)
        setForm(emptyForm(defaultDos))
        setFormError('')
        setShowForm(true)
    }

    const handleOpenEdit = (item) => {
        setEditingItemId(item.id)
        setForm({
            dos_from: toInputDate(item.dos_from) || defaultDos,
            cpt_hcpcs_code: item.cpt_hcpcs_code || '',
            modifiers: item.modifiers || '',
            units: item.units ?? '1.00',
            charge_amount: item.charge_amount ?? '',
            diagnosis_pointer: item.diagnosis_pointer || '',
            place_of_service: item.place_of_service || '',
        })
        setFormError('')
        setShowForm(true)
    }

    const handleCancel = () => {
        setShowForm(false)
        setEditingItemId(null)
        setFormError('')
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => {
            const next = { ...prev, [name]: value }
            if (name === 'cpt_hcpcs_code' && !prev.charge_amount) {
                const match = codeSuggestions.find(
                    c => String(c.code).toUpperCase() === String(value).trim().toUpperCase()
                )
                const fee = match?.default_fee ?? match?.fee ?? match?.price
                if (fee !== undefined && fee !== null && fee !== '') {
                    next.charge_amount = String(fee)
                }
            }
            return next
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!resolvedClaimId) return
        setSaving(true)
        setFormError('')

        const payload = {
            dos_from: form.dos_from,
            cpt_hcpcs_code: form.cpt_hcpcs_code.trim(),
            modifiers: form.modifiers.trim() || null,
            units: Number(form.units || 1),
            charge_amount: Number(form.charge_amount || 0),
            diagnosis_pointer: form.diagnosis_pointer.trim() || null,
            place_of_service: form.place_of_service.trim() || null,
        }

        try {
            let response
            if (editingItemId) {
                response = await crmInstance.put(
                    `/medical-billing/claims/${resolvedClaimId}/items/${editingItemId}`,
                    payload
                )
            } else {
                response = await crmInstance.post(
                    `/medical-billing/claims/${resolvedClaimId}/items`,
                    payload
                )
            }

            if (onClaimUpdated && response.data) {
                onClaimUpdated(response.data)
            }
            setShowForm(false)
            setEditingItemId(null)
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setFormError(
                validationErrors
                    ? Object.values(validationErrors).flat().join(' ')
                    : err.response?.data?.message || 'Failed to save service line.'
            )
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: 'Delete Service Line?',
            text: `Remove code ${item.cpt_hcpcs_code} ($${Number(item.charge_amount || 0).toFixed(2)}) from this claim?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#dc3545',
        })
        if (!result.isConfirmed) return

        try {
            const response = await crmInstance.delete(
                `/medical-billing/claims/${resolvedClaimId}/items/${item.id}`
            )
            if (onClaimUpdated && response.data) {
                onClaimUpdated(response.data)
            }
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to delete service line.',
                icon: 'error',
            })
        }
    }

    const HeadingTag = compact ? 'h6' : 'h5'

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <HeadingTag className="mb-0">Service Lines</HeadingTag>
                {!showForm && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleOpenAdd}
                    >
                        <FiPlus className="me-1" /> Add Service Line
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border rounded p-3 mb-3 bg-light bg-opacity-50">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-semibold small text-dark">
                            {editingItemId ? 'Edit Service Line' : 'New Service Line Entry'}
                        </span>
                    </div>
                    {formError && <div className="alert alert-danger py-2 small">{formError}</div>}

                    <div className="row g-2 align-items-end">
                        <div className="col-md-2">
                            <label className="form-label small mb-1">
                                DOS <span className="text-danger">*</span>
                            </label>
                            <input
                                type="date"
                                name="dos_from"
                                className="form-control form-control-sm"
                                value={form.dos_from}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small mb-1">
                                Code <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                name="cpt_hcpcs_code"
                                list={`claim-code-list-${resolvedClaimId}`}
                                className="form-control form-control-sm"
                                placeholder="e.g. 99214"
                                value={form.cpt_hcpcs_code}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                            <datalist id={`claim-code-list-${resolvedClaimId}`}>
                                {codeSuggestions.map((c, idx) => (
                                    <option key={`${c.code}-${idx}`} value={c.code}>
                                        {c.description || ''}
                                    </option>
                                ))}
                            </datalist>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small mb-1">Modifiers</label>
                            <input
                                type="text"
                                name="modifiers"
                                className="form-control form-control-sm"
                                placeholder="e.g. 25"
                                value={form.modifiers}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>
                        <div className="col-md-1">
                            <label className="form-label small mb-1">
                                Units <span className="text-danger">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                name="units"
                                className="form-control form-control-sm"
                                value={form.units}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small mb-1">
                                Amount ($) <span className="text-danger">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="charge_amount"
                                className="form-control form-control-sm"
                                placeholder="0.00"
                                value={form.charge_amount}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                        </div>
                        <div className="col-md-1">
                            <label className="form-label small mb-1">Dx Ptr</label>
                            <input
                                type="text"
                                name="diagnosis_pointer"
                                className="form-control form-control-sm"
                                placeholder="A"
                                value={form.diagnosis_pointer}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>
                        <div className="col-md-1">
                            <label className="form-label small mb-1">POS</label>
                            <input
                                type="text"
                                name="place_of_service"
                                className="form-control form-control-sm"
                                placeholder="11"
                                value={form.place_of_service}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>
                        <div className="col-md-1 d-flex gap-1">
                            <button
                                type="submit"
                                className="btn btn-sm btn-primary"
                                title="Save"
                                disabled={saving}
                            >
                                <FiSave size={14} />
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                title="Cancel"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                <FiX size={14} />
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>DOS</th>
                            <th>Code</th>
                            <th>Modifiers</th>
                            <th>Units</th>
                            <th>Amount</th>
                            <th>Dx Ptr</th>
                            <th>POS</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center text-muted py-3 small">
                                    No service lines on this claim yet. Click &ldquo;Add Service Line&rdquo; to add an entry.
                                </td>
                            </tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id}>
                                    <td>{formatDate(item.dos_from)}</td>
                                    <td className="fw-semibold">{item.cpt_hcpcs_code}</td>
                                    <td>{item.modifiers || 'N/A'}</td>
                                    <td>{Number(item.units || 0).toFixed(2)}</td>
                                    <td>${Number(item.charge_amount || 0).toFixed(2)}</td>
                                    <td>{item.diagnosis_pointer || 'N/A'}</td>
                                    <td>{item.place_of_service || 'N/A'}</td>
                                    <td className="text-end">
                                        <div className="d-inline-flex gap-1">
                                            <button
                                                type="button"
                                                className="avatar-text avatar-sm border-0"
                                                title="Edit Service Line"
                                                onClick={() => handleOpenEdit(item)}
                                            >
                                                <FiEdit3 size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                className="avatar-text avatar-sm border-0 text-danger"
                                                title="Delete Service Line"
                                                onClick={() => handleDelete(item)}
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
