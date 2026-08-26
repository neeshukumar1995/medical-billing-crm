'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiDownload, FiTrash2, FiUpload, FiFile } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [showUpload, setShowUpload] = useState(false)
    const [file, setFile] = useState(null)
    const [documentType, setDocumentType] = useState('')
    const [patients, setPatients] = useState([])
    const [patientId, setPatientId] = useState('')
    const [uploading, setUploading] = useState(false)

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const response = await crmInstance.get('/medical-billing/documents')
            setDocuments(response.data?.data || [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load documents.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setDocuments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchDocuments() }, [])

    const openUploadForm = async () => {
        setShowUpload(true)
        if (patients.length === 0) {
            try {
                const response = await crmInstance.get('/medical-billing/patients', { params: { per_page: 500 } })
                setPatients(response.data?.data || [])
            } catch {
                // dropdown stays empty
            }
        }
    }

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!file) return
        setUploading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('document_type', documentType)
            if (patientId) formData.append('patient_id', patientId)

            await crmInstance.post('/medical-billing/documents', formData)
            setShowUpload(false)
            setFile(null)
            setDocumentType('')
            setPatientId('')
            fetchDocuments()
        } catch (err) {
            const validationErrors = err.response?.data?.errors
            setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : (err.response?.data?.message || 'Failed to upload document'))
        } finally {
            setUploading(false)
        }
    }

    const handleDownload = async (doc) => {
        try {
            const response = await crmInstance.get(`/medical-billing/documents/${doc.id}/download`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', doc.file_name)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            Swal.fire({ title: 'Error!', text: 'Failed to download document.', icon: 'error' })
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Delete Document', text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/documents/${id}`)
            setDocuments(prev => prev.filter(d => d.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete document.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_documents.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_documents.manage') && !showUpload && (
                        <button className="btn btn-primary" onClick={openUploadForm}>
                            <FiUpload className="me-2" />
                            Upload Document
                        </button>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {showUpload && (
                                    <form onSubmit={handleUpload} className="border rounded p-3 mb-4">
                                        <div className="row g-3">
                                            <div className="col-md-4">
                                                <label className="form-label">File <span className="text-danger">*</span></label>
                                                <input type="file" className="form-control" onChange={(e) => setFile(e.target.files[0])} required disabled={uploading} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Document Type <span className="text-danger">*</span></label>
                                                <select className="form-select" value={documentType} onChange={(e) => setDocumentType(e.target.value)} required disabled={uploading}>
                                                    <option value="">Select</option>
                                                    <option value="insurance_card">Insurance Card</option>
                                                    <option value="lab_result">Lab Result</option>
                                                    <option value="referral">Referral</option>
                                                    <option value="eob">EOB</option>
                                                    <option value="consent_form">Consent Form</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Patient</label>
                                                <select className="form-select" value={patientId} onChange={(e) => setPatientId(e.target.value)} disabled={uploading}>
                                                    <option value="">None</option>
                                                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 mt-3">
                                            <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
                                            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUpload(false)} disabled={uploading}>Cancel</button>
                                        </div>
                                    </form>
                                )}

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>File</th>
                                                <th>Type</th>
                                                <th>Patient</th>
                                                <th>Claim</th>
                                                <th>Uploaded By</th>
                                                <th>Date</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading documents..." variant="spinner" /></td></tr>
                                            ) : documents.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No documents found.</td></tr>
                                            ) : (
                                                documents.map((d) => (
                                                    <tr key={d.id}>
                                                        <td><FiFile className="me-2" />{d.file_name}</td>
                                                        <td className="text-capitalize">{d.document_type?.replace('_', ' ')}</td>
                                                        <td>{d.patient ? `${d.patient.first_name} ${d.patient.last_name}` : 'N/A'}</td>
                                                        <td>{d.claim?.claim_number || 'N/A'}</td>
                                                        <td>{d.uploaded_by?.name || 'N/A'}</td>
                                                        <td>{d.created_at?.substring(0, 10)}</td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                <button type="button" className="avatar-text avatar-md" title="Download" onClick={() => handleDownload(d)}>
                                                                    <FiDownload />
                                                                </button>
                                                                {hasPermission('medical_documents.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(d.id)}>
                                                                        <FiTrash2 />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
