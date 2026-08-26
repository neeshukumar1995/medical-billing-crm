'use client'
import React, { useState, useEffect, useRef } from 'react'
import { FiUpload, FiUser, FiDownload } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { BACKEND_BASE_URL } from '@/config/api'

const PatientImportModal = ({ onClose, onImported }) => {
    const fileInputRef = useRef(null)
    const [file, setFile] = useState(null)
    const [assignedTo, setAssignedTo] = useState('')
    const [users, setUsers] = useState([])
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    // Every employee this batch could be handed to, in one go.
    useEffect(() => {
        const cid = localStorage.getItem('companyId')
        const parsedCid = cid ? JSON.parse(cid) : null
        if (!parsedCid) return
        crmInstance.get(`/users/${parsedCid}`, { params: { all: 1 } })
            .then(({ data }) => setUsers(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => {})
    }, [])

    const handleFileChange = (e) => {
        const f = e.target.files[0]
        if (!f) return
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]
        if (!allowedTypes.includes(f.type)) {
            setError('Please upload only CSV or Excel files.')
            return
        }
        setError('')
        setFile(f)
    }

    const handleUpload = async () => {
        if (!file) {
            setError('Please choose a file first.')
            return
        }
        setUploading(true)
        setError('')
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            if (assignedTo) formData.append('assigned_to', assignedTo)

            const { data } = await crmInstance.post('/medical-billing/patients/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            setResult(data)
            if (data.imported_count > 0 && onImported) onImported()
        } catch (err) {
            setError(err.response?.data?.message || 'Import failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const reset = () => {
        setFile(null)
        setResult(null)
        setError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Bulk Upload Patients</h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        {!result && (
                            <div className="px-3 pt-3">
                                <a
                                    href={`${BACKEND_BASE_URL}/patient_import_sample.csv`}
                                    download
                                    className="btn btn-sm btn-outline-primary"
                                >
                                    <FiDownload className="me-2" />
                                    Download Sample File
                                </a>
                            </div>
                        )}
                        <div className="modal-body">
                            {error && <div className="alert alert-danger py-2">{error}</div>}

                            {result ? (
                                <div>
                                    <div className={`alert ${result.imported_count > 0 ? 'alert-success' : 'alert-warning'}`}>
                                        {result.message}
                                    </div>

                                    {result.skipped_rows?.length > 0 && (
                                        <div className="mb-3">
                                            <div className="fw-semibold small mb-1">Skipped rows:</div>
                                            <ul className="small text-muted mb-0" style={{ maxHeight: 150, overflowY: 'auto' }}>
                                                {result.skipped_rows.map((s, i) => (
                                                    <li key={i}>Row {s.row}{s.name ? ` (${s.name})` : ''}: {s.reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {result.errors?.length > 0 && (
                                        <div>
                                            <div className="fw-semibold small mb-1">Errors:</div>
                                            <ul className="small text-danger mb-0" style={{ maxHeight: 150, overflowY: 'auto' }}>
                                                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    <button className="btn btn-sm btn-light-brand mt-3" onClick={reset}>
                                        Upload another file
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label">Spreadsheet (CSV / Excel)</label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="form-control"
                                            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            onChange={handleFileChange}
                                            disabled={uploading}
                                        />
                                        <div className="form-text">
                                            Columns: first_name, last_name (required), date_of_birth (required), patient_number, gender, phone, email, address, city, state, zip_code, emergency_contact_name, emergency_contact_phone, status.
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label d-flex align-items-center gap-1"><FiUser size={14} /> Assign every imported patient to</label>
                                        <select
                                            className="form-select"
                                            value={assignedTo}
                                            onChange={(e) => setAssignedTo(e.target.value)}
                                            disabled={uploading}
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                        <div className="form-text">Applies to the whole batch — the entire file, not per row.</div>
                                    </div>
                                </>
                            )}
                        </div>
                        {!result && (
                            <div className="modal-footer">
                                <button className="btn btn-light-brand" onClick={onClose} disabled={uploading}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file}>
                                    {uploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <FiUpload className="me-2" />
                                            Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    )
}

export default PatientImportModal
