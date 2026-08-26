'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { encryptId } from '@/utils/encryptId'
import { STATUS_BADGE, PSV_STATUS_BADGE, formatStatusLabel } from '@/constants/credentialingOptions'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    const fetchRecords = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm

            const response = await crmInstance.get('/medical-billing/credentialing', { params })
            const data = response.data?.data
            setRecords(Array.isArray(data) ? data : [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load credentialing records. Please try again.'
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view credentialing records.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            setError(errorMessage)
            setRecords([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchRecords, 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    const handleDelete = async (recordId, providerName) => {
        const result = await Swal.fire({
            title: 'Delete Credentialing Record',
            text: `Are you sure you want to delete the credentialing record for "${providerName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/credentialing/${recordId}`)
            setRecords(prev => prev.filter(r => r.id !== recordId))
            Swal.fire({
                title: 'Deleted!',
                text: `Credentialing record for "${providerName}" has been deleted.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to delete credentialing record.',
                icon: 'error'
            })
        }
    }

    const verificationSummary = (record) => {
        const list = Array.isArray(record.verifications) ? record.verifications : []
        if (list.length === 0) return 'N/A'
        const verifiedCount = list.filter(v => v.status === 'verified').length
        return `${verifiedCount} / ${list.length} Verified`
    }

    const openTasksCount = (record) => {
        const list = Array.isArray(record.tasks) ? record.tasks : []
        return list.filter(t => t.status !== 'completed').length
    }

    const isExpiringSoon = (expirationDate) => {
        if (!expirationDate) return false
        const diffDays = (new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
        return diffDays <= 30
    }

    const expiringSoonCount = (record) => {
        let count = 0
        if (isExpiringSoon(record.expiration_date)) count++
        ;(record.verifications || []).forEach(v => { if (isExpiringSoon(v.expiration_date)) count++ })
        ;(record.documents || []).forEach(d => { if (isExpiringSoon(d.expiration_date)) count++ })
        ;(record.payer_enrollments || []).forEach(p => { if (isExpiringSoon(p.expiration_date)) count++ })
        return count
    }

    return (
        <PermissionGuard permission="medical_credentialing.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_credentialing.manage') && (
                        <Link href="/medical-billing/credentialing/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Credentialing Record
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='dataTables_filter d-flex justify-content-end'>
                                            <label className='d-inline-flex align-items-center gap-2'>
                                                Search:
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder='Provider name...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>Provider</th>
                                                <th>Status</th>
                                                <th>PSV Status</th>
                                                <th>Verifications</th>
                                                <th>Open Tasks</th>
                                                <th>Expiration Date</th>
                                                <th>Expiring Soon</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        <Spinner label="Loading credentialing records..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        {searchTerm ? 'No credentialing records found matching your search.' : 'No credentialing records found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                records.map((record, index) => (
                                                    <tr key={record.id}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            {record.provider ? `${record.provider.first_name} ${record.provider.last_name}` : 'N/A'}
                                                        </td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_BADGE[record.status] || 'secondary'} text-${STATUS_BADGE[record.status] || 'secondary'}`}>
                                                                {formatStatusLabel(record.status)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge bg-soft-${PSV_STATUS_BADGE[record.psv_status] || 'secondary'} text-${PSV_STATUS_BADGE[record.psv_status] || 'secondary'}`}>
                                                                {formatStatusLabel(record.psv_status)}
                                                            </span>
                                                        </td>
                                                        <td>{verificationSummary(record)}</td>
                                                        <td>{openTasksCount(record)}</td>
                                                        <td>
                                                            {record.expiration_date ? (
                                                                <span className={isExpiringSoon(record.expiration_date) ? 'text-danger fw-semibold' : ''}>
                                                                    {record.expiration_date}
                                                                </span>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td>
                                                            {expiringSoonCount(record) > 0 ? (
                                                                <span className="badge bg-soft-danger text-danger">{expiringSoonCount(record)} expiring</span>
                                                            ) : (
                                                                <span className="badge bg-soft-success text-success">OK</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_credentialing.manage') && (
                                                                    <Link href={`/medical-billing/credentialing/edit/${encryptId(record.id)}`} className="avatar-text avatar-md" title="Edit">
                                                                        <FiEdit3 />
                                                                    </Link>
                                                                )}
                                                                {hasPermission('medical_credentialing.manage') && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        onClick={() => handleDelete(record.id, record.provider ? `${record.provider.first_name} ${record.provider.last_name}` : 'this provider')}
                                                                        title="Delete"
                                                                    >
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
