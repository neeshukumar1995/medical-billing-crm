'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { FiMessageSquare, FiEdit3, FiTrash2 } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDateTime } from '@/utils/formatDate'

/**
 * Running notes on a medical claim / bill (payer follow-ups, clearinghouse issues, adjustments, appeals).
 * Staff can view and add notes; a note can be edited/deleted by its author or a billing manager.
 */
const ClaimNotes = ({ claimId, initialNotes = null }) => {
    const { user } = useUser()
    const { hasPermission } = usePermissions()
    const isManager = hasPermission('medical_claims.manage') || hasPermission('medical_claims.delete') || user?.is_superadmin || user?.role === 'superadmin'

    const [notes, setNotes] = useState(Array.isArray(initialNotes) ? initialNotes : [])
    const [loading, setLoading] = useState(!Array.isArray(initialNotes))
    const [draft, setDraft] = useState('')
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    const loadNotes = useCallback(async () => {
        if (!claimId) return
        try {
            setLoading(true)
            const { data } = await crmInstance.get(`/medical-billing/claims/${claimId}/notes`)
            setNotes(Array.isArray(data) ? data : [])
        } catch {
            setNotes([])
        } finally {
            setLoading(false)
        }
    }, [claimId])

    useEffect(() => {
        if (!initialNotes && claimId) {
            loadNotes()
        } else if (Array.isArray(initialNotes)) {
            setNotes(initialNotes)
            setLoading(false)
        }
    }, [claimId, initialNotes, loadNotes])

    const handleAddNote = async (e) => {
        e.preventDefault()
        if (!draft.trim() || saving) return
        setSaving(true)
        try {
            const { data } = await crmInstance.post(`/medical-billing/claims/${claimId}/notes`, {
                note: draft.trim(),
            })
            setNotes(prev => [data, ...prev])
            setDraft('')
            Swal.fire({
                title: 'Note Added',
                text: 'Billing note has been saved successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to add billing note.', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveEdit = async (note) => {
        if (!editText.trim()) return
        try {
            const { data } = await crmInstance.put(`/medical-billing/claims/${claimId}/notes/${note.id}`, {
                note: editText.trim(),
            })
            setNotes(prev => prev.map(n => (n.id === note.id ? data : n)))
            setEditingId(null)
            Swal.fire({
                title: 'Note Updated',
                text: 'Billing note updated successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to update billing note.', 'error')
        }
    }

    const handleDeleteNote = async (note) => {
        const result = await Swal.fire({
            title: 'Delete this note?',
            text: 'Are you sure you want to remove this billing note?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Delete',
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/claims/${claimId}/notes/${note.id}`)
            setNotes(prev => prev.filter(n => n.id !== note.id))
            Swal.fire({
                title: 'Deleted',
                text: 'Billing note has been removed.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete note.', 'error')
        }
    }

    const canChange = (note) => isManager || Number(note.user_id) === Number(user?.id)

    return (
        <div className="card shadow-lg border-0 mb-4" style={{ borderRadius: '20px' }}>
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between pt-4 pb-3 px-4">
                <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                    <FiMessageSquare className="text-primary" />
                    Billing Notes & Follow-ups
                </h5>
                <span className="badge bg-soft-primary text-primary fs-12">
                    {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                </span>
            </div>
            <div className="card-body p-4">
                <form onSubmit={handleAddNote} className="mb-4">
                    <textarea
                        className="form-control mb-2"
                        rows={3}
                        placeholder="Add a billing note — payer call details, rejection reasons, appeal status, corrections..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={saving}
                        maxLength={5000}
                    />
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted fs-11">
                            {draft.length}/5000 characters
                        </span>
                        <button
                            type="submit"
                            className="btn btn-sm btn-primary"
                            disabled={saving || !draft.trim()}
                        >
                            {saving ? 'Saving…' : 'Add Billing Note'}
                        </button>
                    </div>
                </form>

                {loading ? (
                    <div className="text-muted text-center py-4">Loading billing notes…</div>
                ) : notes.length === 0 ? (
                    <div className="text-muted text-center py-4">No billing notes recorded for this claim yet.</div>
                ) : (
                    <ul className="list-group list-group-flush">
                        {notes.map(note => (
                            <li key={note.id} className="list-group-item px-0 py-3 border-bottom">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div className="fs-12 text-muted">
                                        <strong className="text-dark">{note.user?.name || 'Billing Staff'}</strong>
                                        {' · '}
                                        {formatDateTime(String(note.created_at).replace(' ', 'T'))}
                                        {note.updated_at && note.updated_at !== note.created_at && (
                                            <span className="text-muted fst-italic"> · edited</span>
                                        )}
                                    </div>
                                    {canChange(note) && editingId !== note.id && (
                                        <div className="d-flex gap-1">
                                            <button
                                                type="button"
                                                className="avatar-text avatar-sm border-0 bg-transparent text-muted"
                                                title="Edit"
                                                onClick={() => {
                                                    setEditingId(note.id)
                                                    setEditText(note.note)
                                                }}
                                            >
                                                <FiEdit3 size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                className="avatar-text avatar-sm border-0 bg-transparent text-danger"
                                                title="Delete"
                                                onClick={() => handleDeleteNote(note)}
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {editingId === note.id ? (
                                    <div className="mt-2">
                                        <textarea
                                            className="form-control mb-2"
                                            rows={3}
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            maxLength={5000}
                                        />
                                        <div className="d-flex gap-2 justify-content-end">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light"
                                                onClick={() => setEditingId(null)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleSaveEdit(note)}
                                                disabled={!editText.trim()}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-1 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                                        {note.note}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default ClaimNotes

