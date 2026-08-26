'use client'
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'
import crmInstance from '@/utils/crmInstance'
import { BACKEND_BASE_URL } from '@/config/api'
import { FiArrowLeft } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { decryptId } from '@/utils/decryptId';

const EmailHistoryPage = () => {
    const { leadId, cid } = useParams()
    const router = useRouter()
    const [emailHistories, setEmailHistories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchEmailHistories = async () => {
            try {
                const decryptedId = decryptId(leadId)
                const decryptedCid = decryptId(cid)
                if (!decryptedId || !decryptedCid) {
                    setError('Invalid lead ID or company ID')
                    return
                }

                setLoading(true)
                const response = await crmInstance.get(`/leads/${decryptedId}/email-history/${decryptedCid}`)
                if (response.data.status) {
                    setEmailHistories(response.data.data || [])
                } else {
                    setError('Failed to fetch email histories')
                }
            } catch (err) {
                console.error('Error fetching email histories:', err)
                setError('Failed to load email histories. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        if (leadId && cid) {
            fetchEmailHistories()
        }
    }, [leadId, cid])

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex align-items-center gap-3">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => router.back()}
                    >
                        <FiArrowLeft className="me-2" />
                        Back
                    </button>
                    <h4 className="mb-0">Leads Email Histories</h4>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Loading />
                                    </div>
                                )}

                                {!loading && !error && (
                                    <>
                                        {emailHistories.length === 0 ? (
                                            <div className="text-center py-5">
                                                <p className="text-muted">No email histories found for this lead.</p>
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Subject</th>
                                                            <th>To Email</th>
                                                            <th>Body</th>
                                                            <th>Attachments</th>
                                                            <th>Sent By</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {emailHistories.map((history) => (
                                                            <tr key={history.id}>
                                                                <td>{formatDate(history.created_at)}</td>
                                                                <td>{history.subject}</td>
                                                                <td>{history.to_email}</td>
                                                                <td>
                                                                    <div style={{
                                                                        maxWidth: '300px',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        {history.body}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    {history.attachments && history.attachments.length > 0 ? (
                                                                        <div>
                                                                            {history.attachments.map((attachment, index) => (
                                                                                <div key={index} className="mb-1">
                                                                                    <a
                                                                                        href={`${BACKEND_BASE_URL}/storage/${attachment.file_path}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-decoration-none d-flex align-items-center"
                                                                                        style={{ fontSize: '12px' }}
                                                                                    >
                                                                                        📎 {attachment.file_name}
                                                                                        <small className="text-muted ms-1">
                                                                                            ({(attachment.file_size / 1024).toFixed(1)} KB)
                                                                                        </small>
                                                                                    </a>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted small">No attachments</span>
                                                                    )}
                                                                </td>
                                                                <td>{history.user?.name || 'N/A'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EmailHistoryPage