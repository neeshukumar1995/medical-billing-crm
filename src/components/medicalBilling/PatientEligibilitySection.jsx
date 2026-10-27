'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { FiCheckCircle, FiAlertCircle, FiClock, FiShield, FiEdit3 } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import { formatDateTime } from '@/utils/formatDate'

export const getEligibilityMeta = (check) => {
    if (!check) {
        return {
            label: 'Not Checked',
            shortLabel: 'Not Checked',
            color: 'secondary',
            detailText: 'No eligibility check has been run for this patient yet.',
            isNotConfigured: false,
        }
    }

    if (check.status === 'not_configured') {
        return {
            label: 'Live Verification Not Configured',
            shortLabel: 'Not Configured',
            color: 'warning',
            detailText: 'Live payer/clearinghouse integration is not configured. Automatic real-time verification is unavailable — please use Manual Verify after checking with the payer.',
            isNotConfigured: true,
        }
    }

    if (check.status === 'checked') {
        const isManual = check.raw_response?.verification_mode === 'manual'
        const modeSuffix = isManual ? ' (Manually Verified)' : ''
        if (check.eligible === true) {
            return {
                label: 'Eligible',
                shortLabel: 'Eligible',
                color: 'success',
                detailText: check.plan_name
                    ? `Active coverage verified under plan "${check.plan_name}"${modeSuffix}.`
                    : `Active insurance coverage verified${modeSuffix}.`,
                isNotConfigured: false,
            }
        }
        if (check.eligible === false) {
            return {
                label: 'Not Eligible',
                shortLabel: 'Not Eligible',
                color: 'danger',
                detailText: check.plan_name
                    ? `Patient is not eligible under plan "${check.plan_name}"${modeSuffix}.`
                    : `Patient coverage is inactive or not eligible${modeSuffix}.`,
                isNotConfigured: false,
            }
        }
        return {
            label: 'Checked',
            shortLabel: 'Checked',
            color: 'info',
            detailText: `Eligibility check recorded${modeSuffix}.`,
            isNotConfigured: false,
        }
    }

    if (check.status === 'error') {
        return {
            label: 'Verification Error',
            shortLabel: 'Error',
            color: 'danger',
            detailText: 'Eligibility verification encountered an error.',
            isNotConfigured: false,
        }
    }

    return {
        label: check.status ? check.status.replace(/_/g, ' ') : 'Unknown',
        shortLabel: check.status ? check.status.replace(/_/g, ' ') : 'Unknown',
        color: 'secondary',
        detailText: '—',
        isNotConfigured: false,
    }
}

export const EligibilityStatusBadge = ({ check, compact = false }) => {
    const meta = getEligibilityMeta(check)
    const text = compact ? meta.shortLabel : meta.label
    return (
        <span
            className={`badge bg-soft-${meta.color} text-${meta.color}`}
            title={meta.detailText}
        >
            {text}
        </span>
    )
}

const PatientEligibilitySection = ({
    patient,
    patientId,
    onChecked,
    compact = false,
}) => {
    const resolvedPatientId = patientId || patient?.id
    const insurances = patient?.insurances || []
    const primaryInsurance = insurances.find(i => i.is_primary) || insurances[0] || null

    const [checks, setChecks] = useState(() => {
        if (Array.isArray(patient?.eligibility_checks) && patient.eligibility_checks.length > 0) {
            return patient.eligibility_checks
        }
        if (patient?.latest_eligibility_check) {
            return [patient.latest_eligibility_check]
        }
        return []
    })
    const [selectedPayerId, setSelectedPayerId] = useState(primaryInsurance?.payer_id || '')
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState('')

    // Manual verification form state
    const [showManualForm, setShowManualForm] = useState(false)
    const [allPayers, setAllPayers] = useState([])
    const [manualForm, setManualForm] = useState({
        eligible: 'true',
        payer_id: primaryInsurance?.payer_id || '',
        plan_name: '',
        notes: '',
    })
    const [savingManual, setSavingManual] = useState(false)

    // In-place eligibility note editing
    const [editingNoteCheckId, setEditingNoteCheckId] = useState(null)
    const [noteDraft, setNoteDraft] = useState('')
    const [savingNote, setSavingNote] = useState(false)

    const handleSaveEligibilityNote = async (checkId) => {
        if (!checkId) return
        setSavingNote(true)
        try {
            const { data } = await crmInstance.put(`/medical-billing/eligibility-checks/${checkId}/notes`, {
                notes: noteDraft.trim() || null,
            })
            setChecks(prev => prev.map(c => c.id === checkId ? { ...c, notes: data.notes } : c))
            setEditingNoteCheckId(null)
            Swal.fire({
                title: 'Note Saved',
                text: 'Eligibility note updated successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to save eligibility note.', 'error')
        } finally {
            setSavingNote(false)
        }
    }

    useEffect(() => {
        if (Array.isArray(patient?.eligibility_checks) && patient.eligibility_checks.length > 0) {
            setChecks(patient.eligibility_checks)
        } else if (patient?.latest_eligibility_check) {
            setChecks([patient.latest_eligibility_check])
        }
    }, [patient?.eligibility_checks, patient?.latest_eligibility_check])

    useEffect(() => {
        if (primaryInsurance?.payer_id) {
            setSelectedPayerId(primaryInsurance.payer_id)
            setManualForm(prev => ({ ...prev, payer_id: prev.payer_id || primaryInsurance.payer_id }))
        }
    }, [primaryInsurance?.payer_id])

    const loadChecks = useCallback(async () => {
        if (!resolvedPatientId) return
        try {
            const response = await crmInstance.get('/medical-billing/eligibility-checks', {
                params: { patient_id: resolvedPatientId, per_page: 10 },
            })
            const rows = response.data?.data
            if (Array.isArray(rows)) {
                setChecks(rows)
            }
        } catch {
            // Keep existing checks from patient payload if endpoint fails
        }
    }, [resolvedPatientId])

    useEffect(() => {
        if (resolvedPatientId && !patient?.eligibility_checks) {
            loadChecks()
        }
    }, [resolvedPatientId, patient?.eligibility_checks, loadChecks])

    const openManualVerify = async () => {
        setShowManualForm(true)
        setError('')
        if (allPayers.length === 0) {
            try {
                const response = await crmInstance.get('/medical-billing/insurance/payers', {
                    params: { per_page: 500, status: 'active' },
                })
                setAllPayers(response.data?.data || [])
            } catch {
                // fallback to patient's own insurance payers
            }
        }
    }

    const latestCheck = checks[0] || patient?.latest_eligibility_check || null
    const meta = getEligibilityMeta(latestCheck)

    const handleCheckEligibility = async () => {
        if (!resolvedPatientId || checking) return
        setChecking(true)
        setError('')

        try {
            const payload = {
                payer_id: selectedPayerId || primaryInsurance?.payer_id || null,
            }
            const response = await crmInstance.post(
                `/medical-billing/patients/${resolvedPatientId}/eligibility-checks`,
                payload
            )
            const newCheck = response.data
            setChecks(prev => [newCheck, ...prev.filter(c => c.id !== newCheck.id)])

            if (onChecked) {
                onChecked(newCheck)
            }

            if (newCheck.status === 'not_configured') {
                const result = await Swal.fire({
                    title: 'Live Verification Not Configured',
                    text: 'Live clearinghouse integration is not configured. Would you like to record a manual eligibility verification result now?',
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Record Manual Verification',
                    cancelButtonText: 'Close',
                })
                if (result.isConfirmed) {
                    openManualVerify()
                }
            } else if (newCheck.status === 'checked') {
                Swal.fire({
                    title: newCheck.eligible ? 'Eligible' : 'Not Eligible',
                    text: newCheck.plan_name ? `Plan: ${newCheck.plan_name}` : undefined,
                    icon: newCheck.eligible ? 'success' : 'warning',
                })
            }
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to check eligibility.'
            setError(message)
            Swal.fire({
                title: 'Eligibility Check Failed',
                text: message,
                icon: 'error',
            })
        } finally {
            setChecking(false)
        }
    }

    const handleSaveManual = async (e) => {
        e.preventDefault()
        if (!resolvedPatientId || savingManual) return
        setSavingManual(true)
        setError('')

        try {
            const payload = {
                payer_id: manualForm.payer_id || selectedPayerId || primaryInsurance?.payer_id || null,
                eligible: manualForm.eligible === 'true',
                plan_name: manualForm.plan_name.trim() || null,
                notes: manualForm.notes.trim() || null,
            }
            const response = await crmInstance.post(
                `/medical-billing/patients/${resolvedPatientId}/eligibility-checks`,
                payload
            )
            const newCheck = response.data
            setChecks(prev => [newCheck, ...prev.filter(c => c.id !== newCheck.id)])
            setShowManualForm(false)
            setManualForm(prev => ({ ...prev, plan_name: '', notes: '' }))

            if (onChecked) {
                onChecked(newCheck)
            }

            Swal.fire({
                title: newCheck.eligible ? 'Marked as Eligible' : 'Marked as Not Eligible',
                text: 'Manual eligibility verification has been saved.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
            })
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save manual verification.')
        } finally {
            setSavingManual(false)
        }
    }

    const HeadingTag = compact ? 'h6' : 'h5'

    const payerOptions = allPayers.length > 0
        ? allPayers
        : insurances.map(ins => ({ id: ins.payer_id, name: ins.payer?.name || `Payer #${ins.payer_id}` }))

    return (
        <div>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <HeadingTag className="mb-0 d-flex align-items-center gap-2">
                    <FiCheckCircle />
                    Eligibility Verification
                </HeadingTag>

                <div className="d-flex flex-wrap align-items-center gap-2">
                    {insurances.length > 1 && (
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 'auto', minWidth: 180 }}
                            value={selectedPayerId}
                            onChange={(e) => setSelectedPayerId(e.target.value)}
                            disabled={checking}
                            title="Select insurance payer to check"
                        >
                            {insurances.map(ins => (
                                <option key={ins.id} value={ins.payer_id}>
                                    {ins.payer?.name || `Payer #${ins.payer_id}`}
                                    {ins.is_primary ? ' (Primary)' : ins.is_secondary ? ' (Secondary)' : ''}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                        onClick={handleCheckEligibility}
                        disabled={checking}
                    >
                        {checking ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Checking...
                            </>
                        ) : (
                            <>
                                <FiCheckCircle className="me-1" />
                                Check Eligibility
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        onClick={() => (showManualForm ? setShowManualForm(false) : openManualVerify())}
                        disabled={checking}
                    >
                        <FiEdit3 className="me-1" />
                        Manual Verify
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {showManualForm && (
                <form onSubmit={handleSaveManual} className="border rounded p-3 mb-3 bg-white shadow-sm">
                    <div className="fw-semibold mb-2 d-flex align-items-center gap-1">
                        <FiEdit3 size={14} />
                        Record Manual Eligibility Verification
                    </div>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label small mb-1">Verification Result <span className="text-danger">*</span></label>
                            <select
                                className="form-select form-select-sm"
                                value={manualForm.eligible}
                                onChange={(e) => setManualForm(prev => ({ ...prev, eligible: e.target.value }))}
                                disabled={savingManual}
                                required
                            >
                                <option value="true">Eligible (Active Coverage)</option>
                                <option value="false">Not Eligible (Inactive)</option>
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label small mb-1">Payer</label>
                            <select
                                className="form-select form-select-sm"
                                value={manualForm.payer_id}
                                onChange={(e) => setManualForm(prev => ({ ...prev, payer_id: e.target.value }))}
                                disabled={savingManual}
                            >
                                <option value="">Primary / Default Payer</option>
                                {payerOptions.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label small mb-1">Plan Name</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. PPO Gold, Medicare Part B"
                                value={manualForm.plan_name}
                                onChange={(e) => setManualForm(prev => ({ ...prev, plan_name: e.target.value }))}
                                disabled={savingManual}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label small mb-1">Verification Notes</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. Verified via payer portal / call"
                                value={manualForm.notes}
                                onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                                disabled={savingManual}
                            />
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setShowManualForm(false)}
                            disabled={savingManual}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-sm btn-success" disabled={savingManual}>
                            {savingManual ? 'Saving...' : 'Save Verification'}
                        </button>
                    </div>
                </form>
            )}

            <div className="border rounded p-3 bg-light bg-opacity-50">
                <div className="row g-3">
                    <div className="col-md-3">
                        <div className="text-muted small">Eligibility Status</div>
                        <div className="mt-1">
                            <EligibilityStatusBadge check={latestCheck} />
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="text-muted small">Last Checked Date</div>
                        <div className="fw-semibold d-flex align-items-center gap-1 mt-1">
                            <FiClock size={13} className="text-muted" />
                            {latestCheck?.created_at ? (formatDateTime(latestCheck.created_at) || 'N/A') : <span className="text-muted">Never checked</span>}
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="text-muted small">Payer</div>
                        <div className="fw-semibold d-flex align-items-center gap-1 mt-1">
                            <FiShield size={13} className="text-muted" />
                            {latestCheck?.payer?.name
                                || primaryInsurance?.payer?.name
                                || <span className="text-muted">No payer on file</span>}
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="text-muted small">Checked By</div>
                        <div className="fw-semibold mt-1">
                            {latestCheck?.checked_by?.name || <span className="text-muted">—</span>}
                        </div>
                    </div>

                    <div className="col-12">
                        <div className="text-muted small">Verification Details</div>
                        {meta.isNotConfigured ? (
                            <div className="alert alert-warning d-flex align-items-start justify-content-between gap-2 mb-0 mt-1 py-2 px-3 small">
                                <div className="d-flex align-items-start gap-2">
                                    <FiAlertCircle className="flex-shrink-0 mt-1" />
                                    <div>
                                        <strong>Live verification is not configured.</strong>{' '}
                                        {meta.detailText}
                                    </div>
                                </div>
                                {!showManualForm && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-warning text-nowrap"
                                        onClick={openManualVerify}
                                    >
                                        Verify Manually
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="mt-1 small">
                                <span className="fw-semibold">{meta.detailText}</span>
                                {latestCheck?.plan_name && (
                                    <span className="ms-2 text-muted">
                                        &middot; Plan: <strong>{latestCheck.plan_name}</strong>
                                    </span>
                                )}
                                {primaryInsurance?.member_id && (
                                    <span className="ms-2 text-muted">
                                        &middot; Member ID: <strong>{primaryInsurance.member_id}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Eligibility Note Section */}
                    {latestCheck && (
                        <div className="col-12 mt-2 pt-2 border-top">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-muted small fw-semibold">Eligibility Note:</span>
                                {editingNoteCheckId !== latestCheck.id && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link p-0 text-decoration-none"
                                        onClick={() => {
                                            setEditingNoteCheckId(latestCheck.id)
                                            setNoteDraft(latestCheck.notes || '')
                                        }}
                                    >
                                        <FiEdit3 className="me-1" size={12} />
                                        {latestCheck.notes ? 'Edit Note' : '+ Add Note'}
                                    </button>
                                )}
                            </div>
                            {editingNoteCheckId === latestCheck.id ? (
                                <div className="mt-1">
                                    <textarea
                                        className="form-control form-control-sm mb-2"
                                        rows={2}
                                        placeholder="Enter eligibility notes (e.g. verified copay $20, ded met, auth req)..."
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                        disabled={savingNote}
                                    />
                                    <div className="d-flex gap-2 justify-content-end">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light"
                                            onClick={() => setEditingNoteCheckId(null)}
                                            disabled={savingNote}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleSaveEligibilityNote(latestCheck.id)}
                                            disabled={savingNote}
                                        >
                                            {savingNote ? 'Saving...' : 'Save Note'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-dark small">
                                    {latestCheck.notes ? (
                                        <span style={{ whiteSpace: 'pre-wrap' }}>{latestCheck.notes}</span>
                                    ) : (
                                        <span className="text-muted fst-italic">No eligibility note recorded. Click "+ Add Note" to add remarks.</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PatientEligibilitySection
