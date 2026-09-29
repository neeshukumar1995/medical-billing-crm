'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiDownload, FiEdit3 } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { encryptId } from '@/utils/encryptId'
import { AGREEMENT_DOCUMENT_TYPE_OPTIONS, STATUS_BADGE, formatStatusLabel } from '@/constants/credentialingOptions'

const page = () => {
    const router = useRouter()
    const [records, setRecords] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [documentType, setDocumentType] = useState('')

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const params = { agreement_only: 1 }
            if (search) params.search = search
            if (documentType) params.document_type = documentType

            const response = await crmInstance.get('/medical-billing/credentialing-documents', { params })
            const data = response.data?.data
            setRecords(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load agreements. Please try again.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view agreements.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setRecords([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchRecords, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, documentType])

    const handleDownload = (doc) => {
        crmInstance.get(`/medical-billing/credentialing-documents/${doc.id}/download`, { responseType: 'blob' }).then(res => {
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', doc.file_name)
            document.body.appendChild(link)
            link.click()
            link.remove()
        })
    }

    return (
        <PermissionGuard permission="medical_credentialing.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link href="/medical-billing/credentialing/dashboard" className="btn btn-outline-primary">Dashboard</Link>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <p className="text-muted small">Payer agreements, approval letters, and other documents attached to a specific payer enrollment.</p>

                                <div className='row gy-2 mb-3'>
                                    <div className="col-md-4">
                                        <label className="form-label small text-muted">Document Type</label>
                                        <select className="form-select form-select-sm" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                                            <option value="">All</option>
                                            {AGREEMENT_DOCUMENT_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-8">
                                        <label className="form-label small text-muted">Search</label>
                                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Provider name or file name..." className="form-control form-control-sm" />
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} agreement${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Provider</th>
                                                <th>Payer</th>
                                                <th>Document Type</th>
                                                <th>File</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-4">
                                                        <Spinner label="Loading agreements..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-4">No agreements found.</td>
                                                </tr>
                                            ) : (
                                                records.map(doc => (
                                                    <tr key={doc.id}>
                                                        <td>
                                                            {doc.credentialing?.provider ? (
                                                                <Link href={`/medical-billing/providers/profile/${encryptId(doc.credentialing.provider.id)}`}>
                                                                    {doc.credentialing.provider.first_name} {doc.credentialing.provider.last_name}
                                                                </Link>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>{doc.payer_enrollment?.payer?.name || 'N/A'}</td>
                                                        <td>{formatStatusLabel(doc.document_type)}</td>
                                                        <td>{doc.file_name}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_BADGE[doc.status] || 'secondary'} text-${STATUS_BADGE[doc.status] || 'secondary'} text-capitalize`}>
                                                                {doc.status || 'pending'}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                <button type="button" className="avatar-text avatar-md" title="Download" onClick={() => handleDownload(doc)}>
                                                                    <FiDownload />
                                                                </button>
                                                                {doc.credentialing?.id && (
                                                                    <Link href={`/medical-billing/credentialing/edit/${encryptId(doc.credentialing.id)}`} className="avatar-text avatar-md" title="Manage">
                                                                        <FiEdit3 />
                                                                    </Link>
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
