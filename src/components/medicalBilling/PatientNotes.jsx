'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { FiMessageSquare, FiEdit3, FiTrash2 } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDateTime } from '@/utils/formatDate'

/**
 * Running notes on a patient (calls made, follow-ups, billing remarks).
 * Whoever can open the patient — its assigned staff or a manager — can read
 * and add notes; a note can be edited/deleted by its author or a manager
 * (medical_patients.assign). The backend enforces the same rules.
 */
const PatientNotes = ({ patientId }) => {
    const { user } = useUser()
    const { hasPermission } = usePermissions()
    const isManager = hasPermission('medical_patients.assign')

    const [notes, setNotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [draft, setDraft] = useState('')
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    const load = useCallback(async () => {
        try {
            const { data } = await crmInstance.get(`/medical-billing/patients/${patientId}/notes`)
            setNotes(Array.isArray(data) ? data : [])
        } catch {
            setNotes([])
        } finally {
            setLoading(false)
        }
    }, [patientId])

    useEffect(() => { if (patientId) load() }, [patientId, load])

    const addNote = async (e) => {
        e.preventDefault()
        if (!draft.trim()) return
        setSaving(true)
        try {
            const { data } = await crmInstance.post(`/medical-billing/patients/${patientId}/notes`, { note: draft.trim() })
            setNotes(prev => [data, ...prev])
            setDraft('')
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to add note', 'error')
        } finally {
            setSaving(false)
        }
    }

    const saveEdit = async (note) => {
        if (!editText.trim()) return
        try {
            const { data } = await crmInstance.put(`/medical-billing/patients/${patientId}/notes/${note.id}`, { note: editText.trim() })
            setNotes(prev => prev.map(n => (n.id === note.id ? data : n)))
            setEditingId(null)
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to update note', 'error')
        }
    }

    const deleteNote = async (note) => {
        const result = await Swal.fire({
            title: 'Delete this note?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Delete',
        })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/patients/${patientId}/notes/${note.id}`)
            setNotes(prev => prev.filter(n => n.id !== note.id))
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete note', 'error')
        }
    }

    const canChange = (note) => isManager || Number(note.user_id) === Number(user?.id)

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0 d-flex align-items-center gap-2"><FiMessageSquare /> Notes</h5>
                <span className="text-muted fs-12">{notes.length} note{notes.length === 1 ? '' : 's'}</span>
            </div>

            <form onSubmit={addNote} className="mb-3">
                <textarea
                    className="form-control mb-2"
                    rows={3}
                    placeholder="Add a note — call made, follow-up, billing remark…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={saving}
                    maxLength={5000}
                />
                <div className="text-end">
                    <button type="submit" className="btn btn-sm btn-primary" disabled={saving || !draft.trim()}>
                        {saving ? 'Saving…' : 'Add Note'}
                    </button>
                </div>
            </form>

            {loading ? (
                <p className="text-muted small">Loading notes…</p>
            ) : notes.length === 0 ? (
                <p className="text-muted small">No notes yet.</p>
            ) : (
                <ul className="list-group">
                    {notes.map(note => (
                        <li key={note.id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                                <div className="fs-12 text-muted">
                                    <strong className="text-dark">{note.user?.name || 'Unknown'}</strong>
                                    {' · '}{formatDateTime(String(note.created_at).replace(' ', 'T'))}
                                    {note.updated_at && note.updated_at !== note.created_at && ' · edited'}
                                </div>
                                {canChange(note) && editingId !== note.id && (
                                    <div className="d-flex gap-1">
                                        <button type="button" className="avatar-text avatar-sm border-0" title="Edit"
                                            onClick={() => { setEditingId(note.id); setEditText(note.note) }}>
                                            <FiEdit3 size={12} />
                                        </button>
                                        <button type="button" className="avatar-text avatar-sm border-0" title="Delete"
                                            onClick={() => deleteNote(note)}>
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {editingId === note.id ? (
                                <div className="mt-2">
                                    <textarea className="form-control mb-2" rows={3} value={editText}
                                        onChange={(e) => setEditText(e.target.value)} maxLength={5000} />
                                    <div className="d-flex gap-2 justify-content-end">
                                        <button type="button" className="btn btn-sm btn-light-brand" onClick={() => setEditingId(null)}>Cancel</button>
                                        <button type="button" className="btn btn-sm btn-primary" onClick={() => saveEdit(note)} disabled={!editText.trim()}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{note.note}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default PatientNotes
