'use client'
import React, { useState, useRef } from 'react'
import { FiUpload, FiDownload } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { BACKEND_BASE_URL } from '@/config/api'

const VendorImportModal = ({ onClose, onImported }) => {
    const fileInputRef = useRef(null)
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

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

            const { data } = await crmInstance.post('/medical-billing/vendors/import', formData, {
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
                            <h5 className="modal-title">Bulk Upload Vendors</h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        {!result && (
                            <div className="px-3 pt-3">
                                <a
                                    href={`${BACKEND_BASE_URL}/vendor_import_sample.csv`}
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
                                        Columns: name (required), contact_name, phone, email, address, status.
                                    </div>
                                </div>
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
                                    )
                                    }
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

export default VendorImportModal
