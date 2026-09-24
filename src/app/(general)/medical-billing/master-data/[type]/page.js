'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiEdit3, FiTrash2, FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { MEDICAL_CODE_MASTERS } from '@/utils/medicalCodeMasters'
import MasterDataModal from '@/components/medicalBilling/MasterDataModal'

const page = () => {
    const router = useRouter()
    const params = useParams()
    const config = MEDICAL_CODE_MASTERS[params.type]
    const { hasPermission } = usePermissions()

    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [recordModal, setRecordModal] = useState(null) // { id, mode } | null

    const fetchRows = async () => {
        if (!config) return
        try {
            setLoading(true)
            const params = { per_page: 100 }
            if (searchTerm) params.search = searchTerm

            const response = await crmInstance.get(config.endpoint, { params })
            const data = response.data?.data
            setRows(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = `Failed to load ${config.label.toLowerCase()}.`
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setRows([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchRows, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, params.type])

    if (!config) return notFound()

    const handleDelete = async (id, code) => {
        const result = await Swal.fire({
            title: `Delete "${code}"`,
            text: 'Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`${config.endpoint}/${id}`)
            setRows(prev => prev.filter(r => r.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_coding.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_coding.manage') && (
                        <Link href={`/medical-billing/master-data/${params.type}/create`} className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add {config.label.replace(/s$/, '')}
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                <h5 className="mb-3">{config.label}</h5>
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
                                                    placeholder='Code or description...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} record${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Description</th>
                                                {config.extraField && <th>{config.extraField.label}</th>}
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={config.extraField ? 5 : 4} className="text-center py-4"><Spinner label={`Loading ${config.label.toLowerCase()}...`} variant="spinner" /></td></tr>
                                            ) : rows.length === 0 ? (
                                                <tr><td colSpan={config.extraField ? 5 : 4} className="text-center py-4">No records found.</td></tr>
                                            ) : (
                                                rows.map((row) => (
                                                    <tr key={row.id}>
                                                        <td>{row.code}</td>
                                                        <td>{row.description}</td>
                                                        {config.extraField && <td>{row[config.extraField.name] || 'N/A'}</td>}
                                                        <td>
                                                            <span className={`badge bg-soft-${row.status === 'active' ? 'success' : 'secondary'} text-${row.status === 'active' ? 'success' : 'secondary'} text-capitalize`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_coding.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setRecordModal({ id: row.id, mode: 'edit' })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_coding.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(row.id, row.code)}>
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

            {recordModal && (
                <MasterDataModal
                    type={params.type}
                    recordId={recordModal.id}
                    initialMode={recordModal.mode}
                    onClose={() => setRecordModal(null)}
                    onSaved={fetchRows}
                />
            )}
        </PermissionGuard>
    )
}

export default page
